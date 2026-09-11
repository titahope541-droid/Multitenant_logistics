/**
 * Handler middleware — the tier's request pipeline and error boundary.
 *
 * Every route handler is wrapped in `withHandler`. Pipeline order:
 *
 *   1. rate limit          — per-IP sliding window (429 RATE_LIMITED)
 *   2. origin check        — non-GET requests must come from allowed origins
 *   3. handler             — the controller (parse → service → shape)
 *   4. error shaping       — ApiError → its envelope; unknown → 500
 *   5. security headers    — applied to EVERY response, success or error
 *
 * Handlers therefore validate, call services, and `return ok(data)` —
 * cross-cutting concerns live here and nowhere else (docs/backend.md §3).
 */

import type { NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrors } from "@/server/http/errors";
import { fail } from "@/server/http/respond";
import {
  applySecurityHeaders,
  checkRateLimit,
  clientRateLimitKey,
  isOriginAllowed,
  JSON_BODY_MAX_BYTES,
  logSecurityRejection,
} from "@/server/middleware/security";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("http");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type RouteHandler<C = unknown> = (
  request: NextRequest,
  context: C,
) => NextResponse | Promise<NextResponse>;

export function withHandler<C = unknown>(handler: RouteHandler<C>): RouteHandler<C> {
  return async (request, context) => {
    let response: NextResponse;
    try {
      // 1 — rate limit (single-process baseline; shared store in Phase 10)
      const key = clientRateLimitKey(request);
      const rateLimit = checkRateLimit(key);
      if (!rateLimit.allowed) {
        logSecurityRejection("rate_limit", { key });
        throw apiErrors.rateLimited();
      }

      // 2 — origin allow-list for mutating verbs (CSRF baseline)
      if (!SAFE_METHODS.has(request.method)) {
        // body-size ceiling for JSON mutating endpoints
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (contentLength > JSON_BODY_MAX_BYTES) {
          logSecurityRejection("body_too_large", { contentLength });
          throw apiErrors.validation("Request body is too large.");
        }
        const origin = request.headers.get("origin");
        if (origin && !isOriginAllowed(origin)) {
          logSecurityRejection("origin_not_allowed", { origin, method: request.method });
          throw apiErrors.forbidden("Request origin is not allowed.");
        }
      }

      // 3 — the controller
      response = await handler(request, context);
    } catch (error) {
      // 4 — error shaping
      if (error instanceof ApiError) {
        if (error.status >= 500) {
          log.error({ err: error, code: error.code, url: request.url }, "api error");
        } else {
          log.warn({ code: error.code, url: request.url }, "api client error");
        }
        response = fail(error);
      } else {
        log.error({ err: error, url: request.url }, "unhandled error in route handler");
        response = fail(apiErrors.internal());
      }
    }
    // 5 — security headers on every response, success or error
    return applySecurityHeaders(response);
  };
}
