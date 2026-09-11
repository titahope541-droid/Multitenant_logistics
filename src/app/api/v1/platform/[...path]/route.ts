/**
 * /api/v1/platform/* — route group, endpoints PLANNED (Phase 4/9).
 * NOW UNDER AUTHORIZATION: only PLATFORM_ADMIN sessions reach the 501
 * contract — tenant admins and anonymous callers are rejected first
 * (401 UNAUTHORIZED / 403 FORBIDDEN). The backend, not hidden UI,
 * enforces platform access (docs/security.md).
 */

import { apiErrors } from "@/server/http/errors";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

const respond = withAuth(async () => {
  throw apiErrors.notImplemented(
    "Platform administration endpoints arrive in Phase 4 (tenants) and Phase 9 (platform admin).",
  );
}, { roles: ["PLATFORM_ADMIN"] });

export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
export const DELETE = respond;
