/**
 * /api/v1/platform/tenants/:tenantId — IMPLEMENTED (Phase 4).
 *   GET   tenant details (identity + admin summary + package count)
 *   PATCH edit company information / slug (status via lifecycle endpoints)
 * Guard: PLATFORM_ADMIN only.
 */

import {
  getTenantController,
  updateTenantController,
} from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const GET = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return getTenantController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });

export const PATCH = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return updateTenantController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });
