/**
 * GET /api/v1/admin/geocoding/reverse?lat=…&lng=… — backend-mediated
 * reverse lookup for map clicks and marker drags. Guard: TENANT_ADMIN.
 */

import { reverseGeocodingController } from "@/server/controllers/geocoding.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, _context, auth) =>
  reverseGeocodingController(request, auth),
{ roles: ["TENANT_ADMIN"] });
