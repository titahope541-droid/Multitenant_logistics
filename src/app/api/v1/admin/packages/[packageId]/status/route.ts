/**
 * PATCH /api/v1/admin/packages/:packageId/status — update package status
 * and atomically record a status event. Any of the exact five statuses is
 * accepted (admin override is legitimate; sequence is advice, not law).
 * Guard: TENANT_ADMIN.
 */

import { changeStatusController } from "@/server/controllers/package.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ packageId: string }> };

export const PATCH = withAuth<RouteContext>(async (request, context, auth) => {
  const params = await context.params;
  return changeStatusController(request, params, auth);
}, { roles: ["TENANT_ADMIN"] });
