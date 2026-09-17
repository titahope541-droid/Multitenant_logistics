/**
 * Server-side environment configuration.
 *
 * The single place where `process.env` is read for server concerns.
 * Everything else in the server tier imports the typed config from here —
 * never `process.env` sprinkled through business code.
 *
 * Deliberately lazy: nothing throws at module import time so that builds
 * never fail because an optional runtime value is absent. Callers validate
 * what they actually need.
 *
 * See docs/environment.md for the full variable reference.
 */

export type NodeEnvironment = "development" | "test" | "production";

export interface ServerConfig {
  nodeEnv: NodeEnvironment;
  isProduction: boolean;
  /** MongoDB connection string consumed by the Mongoose layer (src/db). */
  mongodbUri: string | null;
  sessionSecret: string | null;
  logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  platformDomain: string;
  /**
   * Additional trusted host suffixes that serve the PLATFORM surface
   * (not tenants) — e.g. ".e2b.app" for preview/staging deployments.
   * Empty in normal/production installs; tenants never resolve through
   * these suffixes.
   */
  platformHostSuffixes: string[];
  /** Geocoding provider configuration (backend-mediated, Phase 7). */
  geocoding: {
    provider: "nominatim";
    baseUrl: string;
    userAgent: string;
    contact: string | null;
  };
}

const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

function resolveNodeEnv(): NodeEnvironment {
  const env = process.env.NODE_ENV;
  return env === "production" || env === "test" ? env : "development";
}

function resolveLogLevel(): ServerConfig["logLevel"] {
  const level = process.env.LOG_LEVEL;
  return (LOG_LEVELS as readonly string[]).includes(level ?? "")
    ? (level as ServerConfig["logLevel"])
    : "info";
}

let cached: ServerConfig | null = null;

/**
 * TEST-ONLY escape hatch: clear the cached snapshot so suite cases can
 * exercise different environment snapshots. Never used by app code.
 */
export function resetServerConfigCacheForTests(): void {
  cached = null;
}

/** Typed, validated snapshot of the server environment. */
export function getServerConfig(): ServerConfig {
  if (cached) return cached;
  const nodeEnv = resolveNodeEnv();
  cached = {
    nodeEnv,
    isProduction: nodeEnv === "production",
    mongodbUri: process.env.MONGODB_URI ?? null,
    sessionSecret: process.env.SESSION_SECRET ?? null,
    logLevel: resolveLogLevel(),
    platformDomain: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "nttrack.com",
    platformHostSuffixes: (process.env.PLATFORM_HOST_SUFFIXES ?? "")
      .split(",")
      .map((suffix) => suffix.trim().toLowerCase())
      .filter(Boolean),
    geocoding: {
      provider: "nominatim",
      baseUrl:
        process.env.GEOCODING_BASE_URL ?? "https://nominatim.openstreetmap.org",
      userAgent:
        process.env.GEOCODING_USER_AGENT ??
        "meridian-logistics/0.1 (multi-tenant tracking platform)",
      contact: process.env.GEOCODING_CONTACT ?? null,
    },
  };
  return cached;
}

/**
 * Assert a secret exists. Used by features that genuinely cannot operate
 * without it (e.g. Phase 3 sessions). Kept explicit so failures are loud
 * and local to the feature, not global at boot.
 */
export function requireSecret(name: "MONGODB_URI" | "SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required secret: ${name}. See docs/environment.md.`);
  }
  return value;
}
