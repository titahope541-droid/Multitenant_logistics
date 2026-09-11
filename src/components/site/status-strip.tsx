"use client";

/**
 * Live foundation telemetry — polls the real GET /api/health endpoint.
 * This strip is the proof that the Phase 1 fullstack loop works:
 * browser → service module → api-client → API tier → database.
 */

import { Activity, Database, Radio, Timer } from "lucide-react";
import { useApiHealth, type HealthStatus } from "@/hooks/use-api-health";

const STATUS_META: Record<HealthStatus, { label: string; dot: string; text: string }> = {
  checking: { label: "CHECKING", dot: "bg-amber", text: "text-amber" },
  healthy: { label: "HEALTHY", dot: "bg-mint", text: "text-mint" },
  degraded: { label: "DEGRADED", dot: "bg-amber", text: "text-amber" },
  offline: { label: "OFFLINE", dot: "bg-crimson", text: "text-crimson" },
};

function Cell({
  icon: Icon,
  label,
  value,
  sub,
  valueClass = "text-paper",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-line px-5 py-6 last:border-b-0 sm:px-6 lg:border-r lg:border-b-0 lg:last:border-r-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-dim" strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">{label}</p>
        <p className={`mt-1.5 text-sm font-semibold tracking-wide ${valueClass}`}>{value}</p>
        <p className="mt-1 truncate font-mono text-[10.5px] text-dim">{sub}</p>
      </div>
    </div>
  );
}

export function StatusStrip() {
  const { status, data, lastCheckedAt } = useApiHealth(8000);
  const meta = STATUS_META[status];
  const db = data?.checks.database;

  return (
    <section aria-label="Live system status" className="border-b border-line bg-ink">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-center justify-between py-3">
          <p className="font-mono text-[10px] tracking-[0.3em] text-dim uppercase">
            Live foundation telemetry — GET /api/health
          </p>
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em]">
            <span className={`h-1.5 w-1.5 animate-pulse-soft rounded-full ${meta.dot}`} />
            <span className={meta.text}>{meta.label}</span>
          </span>
        </div>
        <div className="grid border-t border-line lg:grid-cols-4">
          <Cell
            icon={Activity}
            label="API tier"
            value={meta.label}
            sub={data ? `${data.service} · v${data.version} · ${data.environment}` : "awaiting first probe"}
            valueClass={meta.text}
          />
          <Cell
            icon={Database}
            label="Database"
            value={db ? db.status.toUpperCase() : "—"}
            sub={
              db?.status === "up"
                ? `mongodb ping · ${db.latencyMs ?? 0} ms · pooled`
                : "no live probe yet"
            }
            valueClass={db?.status === "up" ? "text-mint" : "text-amber"}
          />
          <Cell
            icon={Radio}
            label="Realtime tier"
            value="PLANNED"
            sub="Socket.IO contracts pinned · Phase 06"
            valueClass="text-amber"
          />
          <Cell
            icon={Timer}
            label="Uptime"
            value={data ? `${data.uptimeSeconds}s` : "—"}
            sub={
              lastCheckedAt
                ? `last probe ${lastCheckedAt.toLocaleTimeString()} · every 8s`
                : "polling every 8s"
            }
          />
        </div>
      </div>
    </section>
  );
}
