/**
 * GET /api/health — liveness + readiness probe.
 *
 * Thin controller (docs/backend.md §2): all logic lives in the health
 * service. Intentionally outside /api/v1 — it is an infrastructure
 * endpoint used by probes and the developer portal status strip.
 */

import { withHandler } from "@/server/http/with-handler";
import { ok } from "@/server/http/respond";
import { getHealthReport } from "@/server/services/health.service";

export const dynamic = "force-dynamic";

export const GET = withHandler(async () => {
  const report = await getHealthReport();
  return ok(report, {
    message: "API is healthy",
    headers: { "Cache-Control": "no-store" },
  });
});
