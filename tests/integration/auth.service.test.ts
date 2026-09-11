/**
 * Authentication service — security behavior integration tests against a
 * real (in-memory) MongoDB. Covers the entire locked login matrix,
 * session lifecycle, and password-change invalidation.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/server/http/errors";
import { SessionModel } from "@/db/models/session.model";
import { UserModel } from "@/db/models/user.model";
import * as auth from "@/server/services/auth.service";
import { verifyPassword } from "@/server/utils/password";
import { hashSessionToken } from "@/server/utils/session-token";
import {
  clearMemoryMongo,
  startMemoryMongo,
  stopMemoryMongo,
} from "../helpers/mongo-memory";
import { seedSession, seedTenant, seedUser, TEST_PASSWORD } from "../helpers/seed";

beforeAll(startMemoryMongo);
afterEach(clearMemoryMongo);
afterAll(stopMemoryMongo);

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

async function expectApiError(promise: Promise<unknown>, status: number, code: string, message?: string) {
  const apiError = await captureError(promise);
  expect(apiError.status).toBe(status);
  expect(apiError.code).toBe(code);
  if (message) expect(apiError.message).toBe(message);
}

describe("login", () => {
  it("authenticates a tenant admin with an ACTIVE tenant", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id, email: "ops@swift.example.com" });

    const outcome = await auth.login({ email: "Ops@Swift.Example.com ", password: TEST_PASSWORD });

    expect(outcome.user.role).toBe("TENANT_ADMIN");
    expect(outcome.user.tenantId).toBe(String(tenant._id));
    expect(outcome.session.token.length).toBeGreaterThan(20);
    // the safe projection contains ONLY the approved fields
    expect(Object.keys(outcome.user).sort()).toEqual(["email", "id", "name", "role", "tenantId"]);
    // session persisted as a HASH of the token, never the raw value
    const stored = await SessionModel.findOne({ tokenHash: hashSessionToken(outcome.session.token) });
    expect(stored).not.toBeNull();
    expect(JSON.stringify(stored)).not.toContain(outcome.session.token);
  });

  it("authenticates the platform admin (tenantId null)", async () => {
    await seedUser({ role: "PLATFORM_ADMIN", tenantId: null, email: "owner@example.com" });
    const outcome = await auth.login({ email: "owner@example.com", password: TEST_PASSWORD });
    expect(outcome.user.role).toBe("PLATFORM_ADMIN");
    expect(outcome.user.tenantId).toBeNull();
  });

  it("gives the IDENTICAL generic failure for unknown email and wrong password", async () => {
    await seedUser({ role: "PLATFORM_ADMIN", email: "owner@example.com" });

    const unknownEmail = await captureError(
      auth.login({ email: "ghost@example.com", password: "whatever" }),
    );
    const wrongPassword = await captureError(
      auth.login({ email: "owner@example.com", password: "not-the-password" }),
    );

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassword.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.message).toBe("Invalid email or password.");
    expect(wrongPassword.message).toBe("Invalid email or password.");
  });

  it("blocks an inactive user with the same generic message (no enumeration)", async () => {
    await seedUser({ role: "PLATFORM_ADMIN", email: "owner@example.com", status: "SUSPENDED" });
    await expectApiError(
      auth.login({ email: "owner@example.com", password: TEST_PASSWORD }),
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  });

  it("blocks a tenant admin whose tenant is SUSPENDED", async () => {
    const tenant = await seedTenant({ status: "SUSPENDED" });
    await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id, email: "ops@swift.example.com" });
    await expectApiError(
      auth.login({ email: "ops@swift.example.com", password: TEST_PASSWORD }),
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  });

  it("blocks a tenant admin whose tenant is ARCHIVED", async () => {
    const tenant = await seedTenant({ status: "ARCHIVED" });
    await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id, email: "ops@swift.example.com" });
    await expectApiError(
      auth.login({ email: "ops@swift.example.com", password: TEST_PASSWORD }),
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  });

  it("keeps platform admin login working regardless of tenant states", async () => {
    await seedTenant({ status: "SUSPENDED", slug: "swift" });
    await seedUser({ role: "PLATFORM_ADMIN", tenantId: null, email: "owner@example.com" });
    const outcome = await auth.login({ email: "owner@example.com", password: TEST_PASSWORD });
    expect(outcome.user.role).toBe("PLATFORM_ADMIN");
  });
});

describe("session resolution and logout", () => {
  it("resolves a valid session into a fresh auth context", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    const user = await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id });
    const { token } = await seedSession(user);

    const context = await auth.resolveSessionByToken(token);
    expect(context).not.toBeNull();
    expect(context?.user.id).toBe(String(user._id));
    expect(context?.user.tenantId).toBe(String(tenant._id));
  });

  it("returns null for an unknown token", async () => {
    await expect(auth.resolveSessionByToken("definitely-not-a-session")).resolves.toBeNull();
  });

  it("treats an expired session as invalid and deletes it", async () => {
    const user = await seedUser({ role: "PLATFORM_ADMIN", tenantId: null });
    const { token, session } = await seedSession(user, { expiresAt: new Date(Date.now() - 1000) });

    await expect(auth.resolveSessionByToken(token)).resolves.toBeNull();
    await expect(SessionModel.findById(session._id)).resolves.toBeNull();
  });

  it("rejects a session whose user was suspended after login (403 ACCOUNT_SUSPENDED)", async () => {
    const user = await seedUser({ role: "PLATFORM_ADMIN", tenantId: null });
    const { token } = await seedSession(user);
    await UserModel.findByIdAndUpdate(user._id, { status: "SUSPENDED" });
    await expectApiError(auth.resolveSessionByToken(token), 403, "ACCOUNT_SUSPENDED");
  });

  it("rejects a session whose tenant was suspended after login (403 TENANT_SUSPENDED)", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    const user = await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id });
    const { token } = await seedSession(user);
    await (await import("@/db/models/tenant.model")).TenantModel.findByIdAndUpdate(tenant._id, {
      status: "SUSPENDED",
    });
    await expectApiError(auth.resolveSessionByToken(token), 403, "TENANT_SUSPENDED");
  });

  it("rejects a session whose tenant was archived after login (403 TENANT_ARCHIVED)", async () => {
    const tenant = await seedTenant({ slug: "swift" });
    const user = await seedUser({ role: "TENANT_ADMIN", tenantId: tenant._id });
    const { token } = await seedSession(user);
    await (await import("@/db/models/tenant.model")).TenantModel.findByIdAndUpdate(tenant._id, {
      status: "ARCHIVED",
    });
    await expectApiError(auth.resolveSessionByToken(token), 403, "TENANT_ARCHIVED");
  });

  it("logout destroys the server-side session", async () => {
    const user = await seedUser({ role: "PLATFORM_ADMIN", tenantId: null });
    const { token, session } = await seedSession(user);

    await auth.logout(String(session._id));
    await expect(SessionModel.findById(session._id)).resolves.toBeNull();
    await expect(auth.resolveSessionByToken(token)).resolves.toBeNull();
  });
});

describe("change password", () => {
  it("rejects when the current password does not match", async () => {
    const user = await seedUser({ role: "PLATFORM_ADMIN", tenantId: null });
    const { session } = await seedSession(user);
    const context = { user: auth.toSafeUser(user), sessionId: String(session._id) };

    await expectApiError(
      auth.changePassword(context, { currentPassword: "wrong", newPassword: "a-valid-new-password" }),
      401,
      "INVALID_CREDENTIALS",
      "Current password is incorrect.",
    );
  });

  it("rejects a new password that violates policy", async () => {
    const user = await seedUser({ role: "PLATFORM_ADMIN", tenantId: null });
    const { session } = await seedSession(user);
    const context = { user: auth.toSafeUser(user), sessionId: String(session._id) };

    await expectApiError(
      auth.changePassword(context, { currentPassword: TEST_PASSWORD, newPassword: "short" }),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("rehashes, keeps the current session, and invalidates every other session", async () => {
    const user = await seedUser({ role: "PLATFORM_ADMIN", tenantId: null, email: "owner@example.com" });
    const first = await seedSession(user);
    const second = await seedSession(user);
    const third = await seedSession(user);
    const context = { user: auth.toSafeUser(user), sessionId: String(first.session._id) };

    await auth.changePassword(context, {
      currentPassword: TEST_PASSWORD,
      newPassword: "the-new-strong-password",
    });

    // hash rotated: new password verifies, old does not
    const stored = await UserModel.findById(user._id).select("+passwordHash");
    expect(stored).not.toBeNull();
    await expect(verifyPassword(stored!.passwordHash, "the-new-strong-password")).resolves.toBe(true);
    await expect(verifyPassword(stored!.passwordHash, TEST_PASSWORD)).resolves.toBe(false);

    // current session survives; the others are gone
    expect(await auth.resolveSessionByToken(first.token)).not.toBeNull();
    await expect(auth.resolveSessionByToken(second.token)).resolves.toBeNull();
    await expect(auth.resolveSessionByToken(third.token)).resolves.toBeNull();

    // login now requires the new password
    await expectApiError(
      auth.login({ email: "owner@example.com", password: TEST_PASSWORD }),
      401,
      "INVALID_CREDENTIALS",
    );
    const relogin = await auth.login({ email: "owner@example.com", password: "the-new-strong-password" });
    expect(relogin.user.id).toBe(String(user._id));
  });
});
