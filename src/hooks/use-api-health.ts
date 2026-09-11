"use client";

/**
 * useApiHealth — polls GET /api/health and exposes a compact status model
 * for the developer portal's live status strip.
 *
 * Demonstrates the standard client pattern: hook → service → api-client.
 */

import { useEffect, useRef, useState } from "react";
import { fetchApiHealth } from "@/services/health";
import type { ApiHealthData } from "@/types/api";

export type HealthStatus = "checking" | "healthy" | "degraded" | "offline";

export interface ApiHealthState {
  status: HealthStatus;
  data: ApiHealthData | null;
  /** ms the last successful fetch took, from the DB probe onward. */
  lastCheckedAt: Date | null;
}

function deriveStatus(data: ApiHealthData | null, failed: boolean): HealthStatus {
  if (failed) return "offline";
  if (!data) return "checking";
  return data.checks.database.status === "up" ? "healthy" : "degraded";
}

export function useApiHealth(pollIntervalMs = 8000): ApiHealthState {
  const [state, setState] = useState<ApiHealthState>({
    status: "checking",
    data: null,
    lastCheckedAt: null,
  });
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const data = await fetchApiHealth();
        if (!cancelled) {
          setState({ status: deriveStatus(data, false), data, lastCheckedAt: new Date() });
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, status: "offline", lastCheckedAt: new Date() }));
        }
      } finally {
        inFlight.current = false;
      }
    }

    void poll();
    const interval = window.setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return state;
}
