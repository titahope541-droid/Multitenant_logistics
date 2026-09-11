/**
 * GET /api/ready — readiness probe (distinct from liveness).
 *
 *   /api/health → "is the process alive?"        → 200 whenever it can answer
 *   /api/ready  → "can the app serve traffic?"   → 200 only if MongoDB is reachable,
 *                  otherwise 503 with the standard NOT_READY envelope
 *
 * Safe payload: no connection strings, no credentials, no stack traces —
 * just the degraded state (docs/security.md §safe-payloads).
 */

import { apiErrors } from "@/server/http/errors";
import { ok } from "@/server/http/respond";
import { withHandler } from "@/server/http/with-handler";
import { getHealthReport } from "@/server/services/health.service";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const report = await getHealthReport();
  if (report.checks.database.status !== "up") {
    throw apiErrors.notReady("Database is unreachable — the service is not ready.");
  }
  return ok(report, { message: "Service is ready" });
});
