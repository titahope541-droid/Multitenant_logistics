/**
 * /api/v1/platform/tenants/:tenantId/branding — IMPLEMENTED (Phase 8).
 * Focused branding read/save (colors, typography, button style, logo and
 * favicon URLs, theme). Guard: PLATFORM_ADMIN only.
 */

import {
  getBrandingController,
  updateBrandingController,
} from "@/server/controllers/website.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ tenantId: string }> };

export const GET = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return getBrandingController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });

export const PATCH = withAuth<RouteContext>(async (request, context) => {
  const params = await context.params;
  return updateBrandingController(request, params);
}, { roles: ["PLATFORM_ADMIN"] });
