/**
 * POST /api/v1/platform/tenants/:tenantId/admin/reset-password
 * Generates a new temporary password, hashes it, replaces passwordHash,
 * invalidates the admin's sessions. The plaintext is returned exactly ONCE
 * and never stored or logged. Guard: PLATFORM_ADMIN only.
 */

import { resetAdminPasswordController } from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const POST = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return resetAdminPasswordController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });
