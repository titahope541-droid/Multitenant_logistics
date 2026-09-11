/**
 * GET /api/v1/auth/me — IMPLEMENTED (Phase 3).
 * Returns the authenticated user's safe projection; 401 without a session.
 * Session validity (user + tenant status) re-checked on every request.
 */

import { meController } from "@/server/controllers/auth.controller";
import { withAuth } from "@/server/middleware/auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, _context, auth) => meController(auth));
