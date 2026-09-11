/**
 * POST /api/v1/admin/packages/:packageId/archive — soft deletion only
 * (archived = true). Package, events, history, sender/receiver data are
 * all retained. Guard: TENANT_ADMIN.
 */

import { archivePackageController } from "@/server/controllers/package.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ packageId: string }> };

export const POST = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return archivePackageController(request, params, auth);
}, { roles: ["TENANT_ADMIN"] });
