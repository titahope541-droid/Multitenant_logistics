/**
 * GET /api/v1/public/track/:trackingId — IMPLEMENTED (Phase 6).
 *
 * Unauthenticated public lookup behind a strict allowlist:
 *   hostname → tenant (server-authoritative) → ACTIVE? → package scoped
 *   to that tenant → allowlisted projection. Unknown ids, archived
 *   packages, and foreign-tenant ids share one safe 404.
 *
 * Abuse control: dedicated rate limit (30 requests/IP/minute) in addition
 * to the global pipeline limit; trackingId validated by zod; no list or
 * search surface for IDs exists anywhere.
 */

import { apiErrors } from "@/server/http/errors";
import { ok } from "@/server/http/respond";
import { withHandler } from "@/server/http/with-handler";
import {
  checkRateLimit,
  clientRateLimitKey,
} from "@/server/middleware/security";
import { getPublicTracking } from "@/server/services/public-tracking.service";
import { resolveTenantFromHostHeader } from "@/server/services/tenant-resolution.service";
import { getLogger } from "@/server/utils/logger";
import { trackingIdParamSchema } from "@/server/validators/package.validators";
import { validate } from "@/server/validators";

export const dynamic = "force-dynamic";

const log = getLogger("public-tracking");
const PUBLIC_TRACK_RATE_LIMIT = 30;
const PUBLIC_TRACK_WINDOW_MS = 60_000;

type RouteContext = { params: Promise<{ trackingId: string }> };

export const GET = withHandler<RouteContext>(async (request, context) => {
  const key = `public:track:${clientRateLimitKey(request)}`;
  const limit = checkRateLimit(key, PUBLIC_TRACK_RATE_LIMIT, PUBLIC_TRACK_WINDOW_MS);
  if (!limit.allowed) {
    log.warn("public tracking rate limited");
    throw apiErrors.rateLimited("Too many tracking requests. Please wait a moment and try again.");
  }

  const { trackingId } = await context.params;
  const id = validate(trackingIdParamSchema, trackingId);

  const resolution = await resolveTenantFromHostHeader(request.headers.get("host"));
  if (resolution.kind !== "tenant") {
    throw apiErrors.tenantNotFound("This website does not exist.");
  }

  const result = await getPublicTracking(resolution.tenant, id);
  return ok(result);
});
