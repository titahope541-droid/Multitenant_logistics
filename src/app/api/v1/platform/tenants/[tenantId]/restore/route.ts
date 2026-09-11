/**
 * POST /api/v1/platform/tenants/:tenantId/restore — SUSPENDED|ARCHIVED → ACTIVE.
 * Restoration changes status only — tenant, admin and WebsiteConfig are
 * never recreated. Guard: PLATFORM_ADMIN only.
 */

import { transitionTenantController } from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const POST = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return transitionTenantController(request, params, "restore", auth);
}, { roles: ["PLATFORM_ADMIN"] });
