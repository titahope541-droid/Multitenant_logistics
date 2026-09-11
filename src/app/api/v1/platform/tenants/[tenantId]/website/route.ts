/**
 * /api/v1/platform/tenants/:tenantId/website — IMPLEMENTED (Phase 8).
 *   GET   read the tenant's editable website configuration
 *   PATCH save it (partial, section-merged; publishes immediately)
 * Guard: PLATFORM_ADMIN only — Tenant Admins get 403 (no admin equivalent
 * of this endpoint exists anywhere).
 */

import {
  getWebsiteController,
  updateWebsiteController,
} from "@/server/controllers/website.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const GET = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return getWebsiteController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });

export const PATCH = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return updateWebsiteController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });
