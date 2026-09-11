/**
 * PATCH /api/v1/admin/packages/:packageId/location — update the cached
 * current location and atomically append a location_history record.
 * Guard: TENANT_ADMIN.
 */

import { updateLocationController } from "@/server/controllers/package.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ packageId: string }> };

export const PATCH = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return updateLocationController(request, params, auth);
}, { roles: ["TENANT_ADMIN"] });
