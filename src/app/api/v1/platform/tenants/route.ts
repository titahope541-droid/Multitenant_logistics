/**
 * /api/v1/platform/tenants — IMPLEMENTED (Phase 4).
 *   GET  list/search/filter/sort/paginate tenants
 *   POST atomic provisioning: tenant + one tenant admin + WebsiteConfig
 * Guard: PLATFORM_ADMIN only (withAuth role gate).
 */

import {
  createTenantController,
  listTenantsController,
} from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request) => listTenantsController(request), {
  roles: ["PLATFORM_ADMIN"],
});

export const POST = withAuth(async (request) => createTenantController(request), {
  roles: ["PLATFORM_ADMIN"],
});
