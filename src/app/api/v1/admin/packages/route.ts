/**
 * /api/v1/admin/packages — IMPLEMENTED (Phase 5).
 *   GET  tenant-scoped list (search/status/archived/pagination)
 *   POST create package — server mints trackingId, sets PENDING + first
 *        status event atomically. Guard: TENANT_ADMIN only.
 */

import {
  createPackageController,
  listPackagesController,
} from "@/server/controllers/package.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, _context, auth) =>
  listPackagesController(request, auth),
{ roles: ["TENANT_ADMIN"] });

export const POST = withAuth(async (request, _context, auth) =>
  createPackageController(request, auth),
{ roles: ["TENANT_ADMIN"] });
