/**
 * POST /api/v1/auth/login — IMPLEMENTED (Phase 3).
 * Rate-limited, zod-validated, Argon2id-verified; sets the HTTP-only
 * session cookie on success. Generic error on any credential failure.
 */

import { loginController } from "@/server/controllers/auth.controller";
import { withHandler } from "@/server/http/with-handler";

export const dynamic = "force-dynamic";

export const POST = withHandler(async (request) => loginController(request));
