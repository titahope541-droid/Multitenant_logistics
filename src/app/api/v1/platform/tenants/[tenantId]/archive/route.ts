/**
 * POST /api/v1/platform/tenants/:tenantId/archive — ACTIVE → ARCHIVED.
 * Retains all data, hides the tenant from normal lists, blocks login/API.
 * No hard-delete operation exists. Guard: PLATFORM_ADMIN only.
 */

import { transitionTenantController } from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const POST = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return transitionTenantController(request, params, "archive", auth);
}, { roles: ["PLATFORM_ADMIN"] });
