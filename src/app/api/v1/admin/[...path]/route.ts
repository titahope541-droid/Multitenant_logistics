/**
 * /api/v1/admin/* — route group, endpoints PLANNED (Phase 5/8).
 * NOW UNDER AUTHORIZATION: only TENANT_ADMIN sessions with an ACTIVE
 * tenant reach the 501 contract — everyone else is rejected first
 * (401 UNAUTHORIZED / 403 FORBIDDEN / 403 TENANT_SUSPENDED|ARCHIVED).
 */

import { apiErrors } from "@/server/http/errors";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

const respond = withAuth(async () => {
  throw apiErrors.notImplemented(
    "Tenant admin operations arrive in Phase 5 (packages) and Phase 8 (tenant admin).",
  );
}, { roles: ["TENANT_ADMIN"] });

export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
export const DELETE = respond;
