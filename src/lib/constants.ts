/**
 * Platform-wide constants. Pure values — safe on client and server.
 * Anything env-dependent lives in src/server/config/env.ts (server) or
 * NEXT_PUBLIC_* variables (client); this file holds neither.
 */

export const PLATFORM = {
  name: "Meridian",
  codename: "MERIDIAN",
  tagline: "One platform. Every fleet.",
  /** Placeholder until the production domain exists (V1 = subdomains only). */
  domainPlaceholder: "yourplatform.com",
  /** Reserved subdomain for the platform owner control plane. */
  platformAdminSubdomain: "admin",
  phase: 1,
} as const;

export const API_BASE_PATH = "/api/v1";
export const HEALTH_PATH = "/api/health";
