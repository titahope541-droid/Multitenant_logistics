/**
 * POST /api/v1/auth/logout — IMPLEMENTED (Phase 3).
 * Destroys the server-side session (if resolvable) and clears the cookie.
 * Idempotent by design — always succeeds.
 */

import { logoutController } from "@/server/controllers/auth.controller";
import { withHandler } from "@/server/http/with-handler";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (request) => logoutController(request));
