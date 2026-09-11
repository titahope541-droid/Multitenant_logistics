/**
 * /api/v1/auth/* catch-all — unknown authentication endpoints.
 * The real endpoints (login, logout, me, change-password) are concrete
 * routes; anything else in this space answers a structured 404 instead of
 * the framework's default HTML page.
 */

import { apiErrors } from "@/server/http/errors";
import { withHandler } from "@/server/http/with-handler";

export const dynamic = "force-dynamic";

const respond = withHandler(async () => {
  throw apiErrors.notFound("Unknown authentication endpoint.");
});

export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
export const DELETE = respond;
