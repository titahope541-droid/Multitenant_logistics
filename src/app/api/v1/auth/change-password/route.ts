/**
 * POST /api/v1/auth/change-password — IMPLEMENTED (Phase 3).
 * Authenticated: verifies the current password, enforces policy, rehashes,
 * and invalidates every OTHER active session for the account.
 */

import { changePasswordController } from "@/server/controllers/auth.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request, _context, auth) =>
  changePasswordController(request, auth),
);
