/**
 * Health service — the first business-capability module of the tier.
 *
 * Business logic lives in services, not routes (docs/backend.md §2): the
 * /api/health handler is a thin controller over this service.
 *
 * The probe never throws: an unreachable MongoDB degrades the report
 * (`database: "down"`) instead of crashing the process — the API still
 * answers 200 for liveness, with detail for diagnosis (docs/backend.md §7).
 */

import { pingDatabase } from "@/db";
import { getServerConfig } from "@/server/config/env";

export interface DatabaseCheck {
  status: "up" | "down";
  latencyMs: number | null;
}

export interface HealthReport {
  service: string;
  version: string;
  phase: number;
  environment: string;
  checks: { database: DatabaseCheck };
  uptimeSeconds: number;
  timestamp: string;
}

/** Probe MongoDB with a real, timed round trip (`ping`). */
export async function checkDatabase(): Promise<DatabaseCheck> {
  try {
    const latencyMs = await pingDatabase();
    return { status: "up", latencyMs };
  } catch {
    return { status: "down", latencyMs: null };
  }
}

/** Compose the full health report consumed by GET /api/health and probes. */
export async function getHealthReport(): Promise<HealthReport> {
  const config = getServerConfig();
  const database = await checkDatabase();
  return {
    service: "meridian-api",
    version: process.env.npm_package_version ?? "0.1.0",
    phase: 1,
    environment: config.nodeEnv,
    checks: { database },
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
