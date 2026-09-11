import { ArrowDown, Database, MonitorSmartphone, Radio, Server, Workflow } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";

const LAYERS = [
  {
    icon: MonitorSmartphone,
    name: "Browser",
    does: "Tenant websites, public tracking, admin consoles. Collects input, renders envelopes.",
    never: "Touches the database, holds secrets, enforces rules.",
  },
  {
    icon: Workflow,
    name: "UI tier — Next.js",
    does: "App Router pages, server components, the typed browser API client in src/services.",
    never: "Calls fetch outside services/ — or imports from src/server.",
  },
  {
    icon: Server,
    name: "API tier — src/server",
    does: "Route → middleware → controller → service. Auth, tenancy, validation, business logic.",
    never: "Renders UI or trusts client-supplied tenant identifiers.",
  },
  {
    icon: Database,
    name: "MongoDB — source of truth",
    does: "One shared database via Mongoose ODM; tenantId on every tenant-owned document; compound indexes.",
    never: "Exposed to the browser — only the API tier's Mongoose layer talks to it.",
  },
] as const;

const FLOW = ["Request", "Route", "Middleware", "Controller", "Service", "Model", "MongoDB"];

export function Architecture() {
  return (
    <section id="architecture" className="scroll-mt-16 border-b border-line">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading index="01" eyebrow="System architecture" title="Four layers, one direction.">
          Every request travels down the stack and back — no shortcuts. The
          realtime tier rides alongside the API tier and reuses its auth and
          tenant scoping.
        </SectionHeading>

        <div className="grid gap-px border border-line bg-line lg:grid-cols-[1fr_minmax(0,18rem)]">
          {/* pipeline */}
          <div className="bg-ink">
            {LAYERS.map((layer, i) => (
              <div key={layer.name}>
                <div className="group grid gap-4 bg-ink p-6 transition-colors hover:bg-panel sm:grid-cols-[auto_1fr] sm:p-7 lg:grid-cols-[auto_1fr_1fr] lg:items-center">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-dim">0{i + 1}</span>
                    <layer.icon
                      className="h-4 w-4 text-fog transition-colors group-hover:text-signal"
                      strokeWidth={1.5}
                    />
                    <h3 className="text-base font-semibold text-paper lg:w-44">{layer.name}</h3>
                  </div>
                  <p className="text-sm leading-6 text-fog">{layer.does}</p>
                  <p className="border-l-2 border-crimson/40 pl-4 text-xs leading-5 text-dim lg:pl-5">
                    <span className="font-mono text-[9.5px] tracking-[0.2em] text-crimson/80 uppercase">
                      Never
                    </span>
                    <br />
                    {layer.never}
                  </p>
                </div>
                {i < LAYERS.length - 1 ? (
                  <div className="flex justify-center border-y border-line bg-panel py-1.5">
                    <ArrowDown className="h-3.5 w-3.5 text-signal" strokeWidth={1.5} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* realtime sidecar */}
          <div className="flex flex-col justify-between bg-panel p-6 sm:p-7">
            <div>
              <p className="mb-4 flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-amber uppercase">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber" />
                Sidecar — Phase 06
              </p>
              <Radio className="mb-4 h-5 w-5 text-fog" strokeWidth={1.5} />
              <h3 className="text-base font-semibold text-paper">Realtime tier</h3>
              <p className="mt-3 text-sm leading-6 text-fog">
                Socket.IO attaches alongside the HTTP server. Phase 1 already
                pins the event names, payload types, and room topology in{" "}
                <code className="font-mono text-[12px] text-paper/80">
                  src/server/realtime/events.ts
                </code>
                .
              </p>
            </div>
            <div className="mt-8 space-y-2 border-t border-line pt-5 font-mono text-[10.5px] leading-5 text-dim">
              <p>
                <span className="text-fog">events</span> tracking:status.updated
              </p>
              <p>
                <span className="text-fog">rooms</span> tenant:{"{id}"} · tracking:{"{id}"}
              </p>
              <p>
                <span className="text-fog">writes</span> HTTP only — sockets broadcast
              </p>
            </div>
          </div>
        </div>

        {/* request flow strip */}
        <div className="mt-6 flex flex-wrap items-center gap-y-2 border border-line bg-panel px-4 py-3">
          <span className="mr-3 font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
            Request flow
          </span>
          {FLOW.map((step, i) => (
            <span key={step} className="flex items-center font-mono text-[11px]">
              <span className={step === "Controller" || step === "Service" ? "text-paper" : "text-fog"}>
                {step}
              </span>
              {i < FLOW.length - 1 ? <span className="mx-2.5 text-signal">→</span> : null}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
