/**
 * Authentication service — ALL authentication business logic lives here.
 * Controllers stay thin (docs/backend.md §2).
 *
 * IMPLEMENTED IN PHASE 3:
 *   login             email + password → session (opaque token, hash at rest)
 *   logout            destroy the server-side session
 *   resolveSession    cookie token → fresh, re-validated auth context
 *   changePassword    verify current → rehash → invalidate other sessions
 *
 * Security properties (docs/authentication.md):
 *   · ONE generic failure message at login — no account enumeration
 *   · dummy-hash verify when the email is unknown (timing parity)
 *   · user.status and tenant.status re-validated on EVERY request, so
 *     suspension/archival takes effect without waiting for expiry
 *   · passwordHash is loaded explicitly (select:false) and never leaves here
 */

import type { Types } from "mongoose";
import { SessionModel } from "@/db/models/session.model";
import { TenantModel } from "@/db/models/tenant.model";
import { UserModel } from "@/db/models/user.model";
import { apiErrors } from "@/server/http/errors";
import { getLogger } from "@/server/utils/logger";
import {
  checkPasswordPolicy,
  getDummyHash,
  hashPassword,
  verifyPassword,
} from "@/server/utils/password";
import { generateSessionToken, hashSessionToken } from "@/server/utils/session-token";
import type { SafeUser, UserRole } from "@/types/domain";

const log = getLogger("auth");

/** Absolute session lifetime: 7 days from creation (no sliding renewal in V1). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/* ── Safe projection — clients never see the full User document ──────────── */

export function toSafeUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: UserRole;
  tenantId: Types.ObjectId | null;
}): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId ? String(user.tenantId) : null,
  };
}

/* ── Login ───────────────────────────────────────────────────────────────── */

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

export interface LoginOutcome {
  user: SafeUser;
  session: IssuedSession;
}

const GENERIC_FAILURE = "Invalid email or password.";

export async function login(input: {
  email: string;
  password: string;
  userAgent?: string;
}): Promise<LoginOutcome> {
  const email = input.email.trim().toLowerCase();
  const user = await UserModel.findOne({ email }).select("+passwordHash");

  if (!user) {
    // Timing parity: unknown emails still pay one Argon2id verification.
    await verifyPassword(await getDummyHash(), input.password);
    log.info({ email }, "login failed — unknown email");
    throw apiErrors.invalidCredentials(GENERIC_FAILURE);
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password);
  if (!passwordMatches) {
    log.info({ userId: user.id }, "login failed — wrong password");
    throw apiErrors.invalidCredentials(GENERIC_FAILURE);
  }

  if (user.status !== "ACTIVE") {
    log.warn({ userId: user.id, status: user.status }, "login blocked — inactive user");
    // Uniform message on purpose: account status must not reveal existence.
    throw apiErrors.invalidCredentials(GENERIC_FAILURE);
  }

  if (user.role === "TENANT_ADMIN") {
    const tenant = user.tenantId ? await TenantModel.findById(user.tenantId).lean() : null;
    if (!tenant || tenant.status !== "ACTIVE") {
      log.warn(
        { userId: user.id, tenantId: user.tenantId ? String(user.tenantId) : null, tenantStatus: tenant?.status ?? "missing" },
        "login blocked — tenant suspended or archived",
      );
      throw apiErrors.invalidCredentials(GENERIC_FAILURE);
    }
  }

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await SessionModel.create({
    tokenHash: hashSessionToken(token),
    userId: user._id,
    role: user.role,
    tenantId: user.tenantId,
    userAgent: input.userAgent,
    expiresAt,
  });

  log.info({ userId: user.id, role: user.role }, "login success");
  return { user: toSafeUser(user), session: { token, expiresAt } };
}

/* ── Logout ──────────────────────────────────────────────────────────────── */

export async function logout(sessionId: string): Promise<void> {
  await SessionModel.findByIdAndDelete(sessionId);
  log.info({ sessionId }, "logout — session invalidated server-side");
}

/* ── Session resolution (every authenticated request) ────────────────────── */

export interface AuthContext {
  /** Fresh, re-validated, display-safe user. */
  user: SafeUser;
  /** Server-side session id (needed by logout/password change). */
  sessionId: string;
}

export async function resolveSessionByToken(token: string): Promise<AuthContext | null> {
  const session = await SessionModel.findOne({ tokenHash: hashSessionToken(token) });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await session.deleteOne().catch(() => undefined);
    return null;
  }

  const user = await UserModel.findById(session.userId);
  if (!user) {
    await session.deleteOne().catch(() => undefined); // orphan session cleanup
    return null;
  }

  // Post-authentication status enforcement — these MAY be specific, unlike login.
  if (user.status !== "ACTIVE") throw apiErrors.accountSuspended();

  if (user.role === "TENANT_ADMIN") {
    const tenant = user.tenantId ? await TenantModel.findById(user.tenantId).lean() : null;
    if (!tenant) throw apiErrors.tenantSuspended();
    if (tenant.status === "SUSPENDED") throw apiErrors.tenantSuspended();
    if (tenant.status === "ARCHIVED") throw apiErrors.tenantArchived();
  }

  return { user: toSafeUser(user), sessionId: String(session._id) };
}

/* ── Password change ─────────────────────────────────────────────────────────
 * Behavior (documented in docs/authentication.md §invalidation):
 * the CURRENT session survives (the caller just proved possession of the
 * current password and is actively using the account); every OTHER session
 * for this user is destroyed — a leaked/stolen session cannot survive a
 * password change.
 * ─────────────────────────────────────────────────────────────────────────── */

export async function changePassword(
  context: AuthContext,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await UserModel.findById(context.user.id).select("+passwordHash");
  if (!user) throw apiErrors.unauthorized();

  const currentMatches = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!currentMatches) {
    log.info({ userId: user.id }, "password change failed — current password mismatch");
    throw apiErrors.invalidCredentials("Current password is incorrect.");
  }

  const policy = checkPasswordPolicy(input.newPassword);
  if (!policy.valid) {
    throw apiErrors.validation(`'newPassword': ${policy.issues.join("; ")}`);
  }

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();

  const destroyed = await SessionModel.deleteMany({
    userId: user._id,
    _id: { $ne: context.sessionId },
  });
  log.info(
    { userId: user.id, invalidated: destroyed.deletedCount },
    "password changed — other sessions invalidated, current session preserved",
  );
}
