/**
 * GET /api/v1/platform/stats — IMPLEMENTED (Phase 8).
 * Platform overview metrics: tenants by lifecycle + package totals.
 * Guard: PLATFORM_ADMIN only.
 */

import { platformStatsController } from "@/server/controllers/tenant.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async () => platformStatsController(), {
  roles: ["PLATFORM_ADMIN"],
});
