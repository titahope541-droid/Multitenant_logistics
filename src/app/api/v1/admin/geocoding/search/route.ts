/**
 * GET /api/v1/admin/geocoding/search?q=… — backend-mediated location
 * search (normalized results only). Guard: TENANT_ADMIN + rate limit.
 */

import { searchGeocodingController } from "@/server/controllers/geocoding.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, _context, auth) =>
  searchGeocodingController(request, auth),
{ roles: ["TENANT_ADMIN"] });
