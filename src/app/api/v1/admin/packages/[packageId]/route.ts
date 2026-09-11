/**
 * GET /api/v1/admin/packages/:packageId — tenant-scoped details with full
 * status history and location history (admin surface). Never leaks across
 * tenants: ownership is part of the query itself. Guard: TENANT_ADMIN.
 */

import { getPackageDetailsController } from "@/server/controllers/package.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ packageId: string }> };

export const GET = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return getPackageDetailsController(request, params, auth);
}, { roles: ["TENANT_ADMIN"] });
