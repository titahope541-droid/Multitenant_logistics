import { Lock } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { PACKAGE_STATUSES, PACKAGE_STATUS_META } from "@/types/domain";

const DECISIONS = [
  ["Stack", "Next.js + React + TypeScript everywhere — no competing UI framework."],
  ["Backend tier", "Layered Node API tier kept separate from UI: routes, middleware, controllers, services."],
  ["ODM", "Mongoose is the ODM — used directly. No second ODM or ORM, ever."],
  ["Database", "One shared MongoDB database — the source of truth."],
  ["Isolation", "tenantId on every tenant-owned record, scoped server-side."],
  ["Realtime", "Socket.IO. Broadcast-only; writes stay on the HTTP API."],
  ["Customers", "No Customer entity. Anonymous tracking by ID."],
  ["Tenant admin", "Package and tracking management only — nothing else."],
  ["Platform admin", "Website, branding, and tenant management."],
  ["Tenant sites", "Configuration-driven rendering — no per-tenant code forks."],
  ["Uploads", "No tenant file-upload system in V1."],
  ["Domains", "Subdomains of the platform domain only in V1."],
  ["Auth", "Secure HTTP-only cookie sessions (Phase 3). No tokens in localStorage."],
] as const;

export function Charter() {
  return (
    <section id="charter" className="scroll-mt-16 border-b border-line">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading index="03" eyebrow="Locked decisions" title="The charter beneath the code.">
          These decisions are not revisited casually during implementation. A
          change requires an explicit record, updated docs, and a reason.
        </SectionHeading>

        <div className="divide-y divide-line border-y border-line">
          {DECISIONS.map(([name, detail], i) => (
            <div
              key={name}
              className="group grid items-baseline gap-2 py-4 transition-colors hover:bg-panel sm:grid-cols-[3rem_14rem_1fr] sm:gap-6 sm:px-4"
            >
              <span className="font-mono text-[10px] text-dim">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex items-center gap-2 text-sm font-semibold tracking-wide text-paper">
                <Lock className="h-3 w-3 text-signal opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2} />
                {name.toUpperCase()}
              </span>
              <span className="text-sm leading-6 text-fog">{detail}</span>
            </div>
          ))}
        </div>

        {/* the five locked statuses */}
        <div className="mt-10 border border-line bg-panel p-6 sm:p-8">
          <p className="mb-6 font-mono text-[10px] tracking-[0.3em] text-dim uppercase">
            Locked decision #14 — exactly five package statuses, in order
          </p>
          <ol className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-0">
            {PACKAGE_STATUSES.map((status, i) => (
              <li key={status} className="flex items-center">
                <span className="flex items-center gap-3 border border-line-strong bg-ink px-4 py-2.5">
                  <span className="font-mono text-[10px] text-signal">
                    {PACKAGE_STATUS_META[status].step}
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.14em] text-paper">
                    {status}
                  </span>
                </span>
                {i < PACKAGE_STATUSES.length - 1 ? (
                  <span className="mx-3 hidden text-dim sm:inline">→</span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs leading-5 text-dim">
            Pinned in code at{" "}
            <code className="font-mono text-paper/80">src/types/domain.ts</code> — database,
            API payloads, realtime events, and UI all derive from that single
            definition. No sixth status in V1.
          </p>
        </div>
      </div>
    </section>
  );
}
