/**
 * POST /api/v1/admin/packages/:packageId/restore — archived = false.
 * Tracking ID and full history remain untouched. Guard: TENANT_ADMIN.
 */

import { restorePackageController } from "@/server/controllers/package.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ packageId: string }> };

export const POST = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return restorePackageController(request, params, auth);
}, { roles: ["TENANT_ADMIN"] });
