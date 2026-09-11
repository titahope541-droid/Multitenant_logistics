/**
 * POST /api/v1/platform/tenants/:tenantId/suspend — ACTIVE → SUSPENDED.
 * Blocks tenant-admin login/API and destroys the tenant's live sessions.
 * Data is retained. Guard: PLATFORM_ADMIN only.
 */

import { transitionTenantController } from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const POST = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return transitionTenantController(request, params, "suspend", auth);
}, { roles: ["PLATFORM_ADMIN"] });
