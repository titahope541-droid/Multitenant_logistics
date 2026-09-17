/**
 * Shared validation patterns — pure regexes used by BOTH the Mongoose
 * schemas (database boundary) and the zod validators (request boundary).
 *
 * Keeping them in one place avoids the two validation layers drifting
 * apart. Client-safe: no Node or Mongoose imports.
 */

/** Pragmatic email shape check (full RFC validation is intentionally not attempted). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tenant slug — the subdomain identifier: `swift.nttrack.com` → "swift".
 * Lowercase alphanumeric segments joined by single hyphens.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** MongoDB ObjectId as a 24-char hex string (used in params and references). */
export const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/;

/** CSS hex color for tenant branding: #rgb or #rrggbb. */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** HTTP(S) URLs only — used for logo and social links. */
export const HTTP_URL_PATTERN = /^https?:\/\/.+/i;

/**
 * Tracking ID path parameter shape. The final server-generated format is
 * decided in Phase 5 (docs/database.md §5) — this only constrains the
 * public lookup surface to safe characters and length.
 */
export const TRACKING_ID_PARAM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/;
