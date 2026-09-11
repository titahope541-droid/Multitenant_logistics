/**
 * GET /api/v1/platform/tenants/:tenantId/packages — IMPLEMENTED (Phase 8).
 *
 * The server-authorized "Open tenant dashboard" data path: a Platform
 * Admin READS one tenant's packages while remaining a Platform Admin —
 * no credential borrowing, no impersonation, no session swap. Scoped
 * explicitly to the requested tenantId. Guard: PLATFORM_ADMIN only.
 */

import { listTenantPackagesController } from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const GET = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return listTenantPackagesController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });
