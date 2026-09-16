/**
 * Security foundation — IMPLEMENTED IN PHASE 2.
 *
 * Deliberately scoped to what this phase may own (docs/security.md):
 *
 *   IMPLEMENTED NOW
 *   · security headers on every API response (Helmet-equivalent set,
 *     applied inside withHandler so errors are covered too)
 *   · Origin allow-list check for non-GET requests (CSRF tolerance baseline)
 *   · single-process sliding-window rate limiter (per client IP)
 *
 *   PREPARED FOR LATER PHASES — NOT IMPLEMENTED NOW
 *   · cookie session + CSRF tokens        (Phase 3, cookie architecture)
 *   · shared/distributed rate-limit store (Phase 10 — this Map is a
 *     single-process baseline; each runtime instance counts separately)
 *
 * No Express-only middleware packages: the tier runs on the managed Node
 * runtime (docs/backend.md §1), so the same controls are implemented as
 * composable TypeScript utilities.
 */

import type { NextRequest, NextResponse } from "next/server";
import { getServerConfig } from "@/server/config/env";
import { getLogger } from "@/server/utils/logger";

const log = getLogger("security");

/* ── Security headers ────────────────────────────────────────────────────── */

/**
 * API responses are JSON for programmatic clients: denying framing and
 * sniffing, disabling referrer and browser features is the safe default.
 * Public-cacheable payloads (if any appear later) opt out per-route.
 */
export const API_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
};

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  // HSTS only where HTTPS is real (docs/security.md §transport).
  if (getServerConfig().isProduction) {
    response.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  return response;
}

/** Request-body ceiling for JSON mutating endpoints (defense against
 *  oversized-POST abuse; Nginx also caps at 2m upstream in production). */
export const JSON_BODY_MAX_BYTES = 1_000_000;

/* ── Origin allow-list (baseline CSRF defense for mutations) ─────────────── */

/**
 * An Origin header is allowed when it matches the configured app origin,
 * any subdomain of the platform domain (tenant sites), or localhost in
 * development. Requests WITHOUT an Origin header (curl, server-to-server)
 * are not blocked here — cookie-based CSRF tokens (Phase 3) govern them
 * when session endpoints exist.
 */
export function isOriginAllowed(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const config = getServerConfig();
  if (parsed.hostname === config.platformDomain) return true;
  if (parsed.hostname.endsWith(`.${config.platformDomain}`)) return true;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (parsed.origin === new URL(appUrl).origin) return true;
    } catch {
      /* malformed NEXT_PUBLIC_APP_URL — fall through */
    }
  }

  if (
    !config.isProduction &&
    (parsed.hostname === "localhost" ||
      parsed.hostname.endsWith(".localhost") ||
      parsed.hostname === "127.0.0.1")
  ) {
    return true;
  }
  return false;
}

/* ── Rate limiting (single-process baseline) ─────────────────────────────── */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweepAt = Date.now();

const DEFAULT_LIMIT = 120; // requests…
const DEFAULT_WINDOW_MS = 60_000; // …per minute, per client key

export interface RateLimitOutcome {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitOutcome {
  const now = Date.now();

  // Opportunistic sweep keeps the Map bounded without a timer.
  if (buckets.size > 1024 && now - lastSweepAt > windowMs) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    lastSweepAt = now;
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count <= limit) {
    return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Client identity for rate limiting — first forwarded hop or "anonymous". */
export function clientRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "anonymous";
  return request.headers.get("x-real-ip") ?? "anonymous";
}

export function logSecurityRejection(kind: string, detail: Record<string, unknown>): void {
  log.warn({ kind, ...detail }, "request rejected by security middleware");
}
