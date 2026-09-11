/**
 * Authentication & authorization middleware foundation.
 *
 *   requireAuth   → withAuth(handler)             any authenticated user
 *   requireRole   → withAuth(handler, { roles })  role allow-list
 *   tenant access → the AuthContext carries the AUTHORITATIVE tenantId,
 *                   resolved from the server-side session — never from
 *                   request bodies or query params (docs/security.md §1)
 *
 * `withAuth` composes inside the existing pipeline: it delegates to
 * withHandler, so rate limiting, origin checks, security headers, and the
 * error boundary apply to authenticated routes exactly as to public ones.
 *
 * Role model (locked): PLATFORM_ADMIN and TENANT_ADMIN only. The backend —
 * not the frontend — decides what each role may reach.
 */

import type { NextRequest, NextResponse } from "next/server";
import { apiErrors } from "@/server/http/errors";
import { withHandler, type RouteHandler } from "@/server/http/with-handler";
import {
  resolveSessionByToken,
  type AuthContext,
} from "@/server/services/auth.service";
import { SESSION_COOKIE_NAME } from "@/server/utils/session-token";
import type { UserRole } from "@/types/domain";

export type { AuthContext };

export type AuthedHandler<C = unknown> = (
  request: NextRequest,
  context: C,
  auth: AuthContext,
) => NextResponse | Promise<NextResponse>;

/**
 * Authorization gate: session must exist; role (if given) must match.
 * Throws ApiError — rendered by withHandler into the standard envelope.
 * Pure and unit-tested (tests/authorization.test.ts).
 */
export function authorize(
  auth: AuthContext | null,
  roles?: readonly UserRole[],
): AuthContext {
  if (!auth) {
    throw apiErrors.unauthorized("A valid session is required.");
  }
  if (roles && roles.length > 0 && !roles.includes(auth.user.role)) {
    throw apiErrors.forbidden("You do not have the role required for this action.");
  }
  return auth;
}

/** Read the bearer token from the HTTP-only cookie. */
export function readSessionCookie(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Resolve session → user → tenant status (fresh check per request) and
 * enforce the optional role allow-list before the controller runs.
 */
export function withAuth<C = unknown>(
  handler: AuthedHandler<C>,
  options: { roles?: readonly UserRole[] } = {},
): RouteHandler<C> {
  return withHandler<C>(async (request, context) => {
    const token = readSessionCookie(request);
    const auth = token ? await resolveSessionByToken(token) : null;
    const authorized = authorize(auth, options.roles);
    return handler(request, context, authorized);
  });
}
