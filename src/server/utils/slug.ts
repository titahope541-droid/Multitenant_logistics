/**
 * Tenant slug utilities.
 *
 * The slug is the tenant's subdomain identity: `swift.nttrack.com`.
 * Rules (docs/tenant-management.md §slug): lowercase, URL-safe
 * alphanumeric segments joined by single hyphens, unique platform-wide,
 * and never one of the reserved platform names.
 */

import { SLUG_PATTERN } from "@/lib/validation-patterns";

/**
 * Reserved subdomains — can never be tenant slugs. `admin` is the
 * platform control plane; the rest are operational/conventional spaces.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "admin",
  "www",
  "api",
  "app",
  "status",
  "docs",
  "mail",
  "email",
  "support",
  "help",
  "login",
  "auth",
  "platform",
  "dashboard",
];

/**
 * Normalize arbitrary input into slug form. Lossy on purpose: "Swift
 * Logistics  Ltd.!" → "swift-logistics-ltd". Uniqueness is enforced
 * separately (409 on conflict) — we never silently rewrite a taken slug.
 */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces/underscores → hyphens
    .replace(/[^a-z0-9-]/g, "") // drop unsafe characters
    .replace(/-{2,}/g, "-") // collapse repeats
    .replace(/^-+|-+$/g, ""); // trim edge hyphens
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 48 && SLUG_PATTERN.test(slug);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}
