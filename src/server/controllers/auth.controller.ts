/**
 * Auth controller — thin HTTP adapters over the auth service.
 * Responsibilities ONLY: parse/validate input → call service → shape the
 * response envelope → set/clear the session cookie. No business rules here.
 */

import type { NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrors } from "@/server/http/errors";
import { readJsonBody } from "@/server/http/read-json";
import { ok } from "@/server/http/respond";
import { readSessionCookie, type AuthContext } from "@/server/middleware/auth";
import { checkRateLimit, clientRateLimitKey } from "@/server/middleware/security";
import { validate } from "@/server/validators";
import { changePasswordSchema, loginSchema } from "@/server/validators/auth.validators";
import * as authService from "@/server/services/auth.service";
import { getServerConfig } from "@/server/config/env";
import { SESSION_COOKIE_NAME } from "@/server/utils/session-token";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("auth");

/* Brute-force guard for the login endpoint (docs/authentication.md §rate).
   10 attempts per IP per 10 minutes — strict but humane. */
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_MS = 10 * 60 * 1000;

/* ── Cookie lifecycle ──────────────────────────────────────────────────────
 * HttpOnly always · SameSite=Lax always · Secure in production only
 * (local development runs on plain http://localhost).
 * ─────────────────────────────────────────────────────────────────────────── */

function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  const { isProduction } = getServerConfig();
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

function clearSessionCookie(response: NextResponse): void {
  const { isProduction } = getServerConfig();
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/* ── POST /api/v1/auth/login ─────────────────────────────────────────────── */

export async function loginController(request: NextRequest): Promise<NextResponse> {
  const key = `auth:login:${clientRateLimitKey(request)}`;
  const limit = checkRateLimit(key, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS);
  if (!limit.allowed) {
    log.warn("login rate limited");
    throw apiErrors.rateLimited("Too many login attempts. Please try again later.");
  }

  const input = validate(loginSchema, await readJsonBody(request));
  const outcome = await authService.login({
    ...input,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const response = ok({ user: outcome.user }, { message: "Login successful." });
  setSessionCookie(response, outcome.session.token, outcome.session.expiresAt);
  return response;
}

/* ── POST /api/v1/auth/logout ──────────────────────────────────────────────
 * Idempotent: always clears the cookie, even when the session is already
 * gone/expired/suspended — the client can always reach a clean state.
 * ─────────────────────────────────────────────────────────────────────────── */

export async function logoutController(request: NextRequest): Promise<NextResponse> {
  const token = readSessionCookie(request);
  if (token) {
    try {
      const auth = await authService.resolveSessionByToken(token);
      if (auth) await authService.logout(auth.sessionId);
    } catch (error) {
      // Suspended-account / suspended-tenant sessions: cookie is cleared anyway.
      if (!(error instanceof ApiError)) throw error;
    }
  }
  const response = ok({}, { message: "Logged out." });
  clearSessionCookie(response);
  return response;
}

/* ── GET /api/v1/auth/me ─────────────────────────────────────────────────── */

export async function meController(auth: AuthContext): Promise<NextResponse> {
  return ok({ user: auth.user });
}

/* ── POST /api/v1/auth/change-password ───────────────────────────────────── */

export async function changePasswordController(
  request: NextRequest,
  auth: AuthContext,
): Promise<NextResponse> {
  const input = validate(changePasswordSchema, await readJsonBody(request));
  await authService.changePassword(auth, input);
  return ok({}, { message: "Password updated. Other sessions have been signed out." });
}
