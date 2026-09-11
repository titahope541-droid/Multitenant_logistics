import { Check } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

const PHASES = [
  [1, "Project Foundation", "Repo, config, layered backend tier, DB connection architecture, realtime contracts, health probe, full documentation."],
  [2, "Backend + Database", "Planned tables, constraints, indexes, migrations, seed data, service-layer patterns."],
  [3, "Authentication", "HTTP-only cookie sessions, password hashing, role guards for /admin and /platform."],
  [4, "Tenant Management", "Tenant CRUD, slug/subdomain host resolution, request-scoped tenant context."],
  [5, "Packages + Tracking", "Package CRUD, global tracking IDs, the five-status state machine, public tracking endpoint."],
  [6, "Tenant Websites + Public Tracking", "Hostname tenant resolution, configuration-driven sites, /track and the allowlisted public API."],
  [7, "Maps & Realtime Tracking", "Leaflet/OSM location UX + one-server Socket.IO: rooms, DB-first broadcasts."],
  [8, "Platform Admin & Website Management", "Control plane: tenant detail tabs, website + branding editors, preview, metrics."],
  [9, "Notifications & Customer Sharing", "Copy ID/link flows, WhatsApp share URLs, live-update indicators — no providers."],
  [10, "Security Hardening", "Rate limits, security headers, CORS allowlist, CSRF checks — full audit pass."],
  [11, "Testing & QA", "Service unit tests, API integration tests, tenant-isolation suite, E2E smoke flows."],
  [12, "Production Deployment", "Deployment config, secrets wiring, monitoring baseline, launch checklist."],
] as const;

export function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-16 border-b border-line bg-panel">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading index="04" eyebrow="Implementation roadmap" title="Twelve phases. Foundations first.">
          Each phase builds strictly on the previous one. Future phases are
          documented, not implemented — nothing business-shaped ships before
          its phase.
        </SectionHeading>

        <ol className="relative">
          {PHASES.map(([num, title, summary]) => {
            const complete = num <= 11;
            const upNext = num === 12;
            return (
              <li
                key={num}
                className={cn(
                  "group grid gap-3 border-t border-line py-6 transition-colors last:border-b sm:grid-cols-[5rem_6rem_1fr] sm:items-baseline lg:grid-cols-[5rem_7rem_1fr_auto]",
                  complete ? "bg-ink/60" : "hover:bg-ink/40",
                )}
              >
                <span className="font-mono text-[11px] text-dim">
                  PHASE {String(num).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1.5 border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.18em]",
                    complete
                      ? "border-mint/40 text-mint"
                      : upNext
                        ? "border-signal/50 text-signal"
                        : "border-line text-dim",
                  )}
                >
                  {complete ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  {complete ? "COMPLETE" : upNext ? "UP NEXT" : "QUEUED"}
                </span>
                <span>
                  <span
                    className={cn(
                      "block text-base font-semibold sm:text-lg",
                      complete ? "text-paper" : "text-fog group-hover:text-paper",
                    )}
                  >
                    {title}
                  </span>
                  <span className="mt-1 block max-w-3xl text-sm leading-6 text-dim">
                    {summary}
                  </span>
                </span>
                {upNext ? (
                  <span className="hidden font-mono text-[10px] tracking-[0.25em] text-signal lg:block">
                    YOU ARE HERE
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>

        <p className="mt-8 font-mono text-[10.5px] leading-5 tracking-[0.1em] text-dim uppercase">
          Standing rule — docs update in the same change as the code.
        </p>
      </div>
    </section>
  );
}
