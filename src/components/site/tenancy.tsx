import { KeyRound, PackageSearch, ShieldCheck, UserRound, Users, Workflow } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";

const RESOLUTION_STEPS = [
  { label: "HOST", value: "swift.yourplatform.com" },
  { label: "SUBDOMAIN", value: `"swift" → tenants.slug` },
  { label: "CONTEXT", value: "{ tenantId } attached server-side" },
  { label: "SCOPE", value: "every query filter: { tenantId }" },
];

const USER_LAYERS = [
  {
    icon: ShieldCheck,
    role: "Platform Admin",
    account: "account",
    scope: "Tenants · website configuration · branding · platform settings.",
  },
  {
    icon: PackageSearch,
    role: "Tenant Admin",
    account: "account",
    scope: "Packages · statuses · locations · tracking operations — own tenant only.",
  },
  {
    icon: UserRound,
    role: "End Customer",
    account: "NO account",
    scope: "Visits the tenant site, enters a tracking ID, views tracking. That is all.",
  },
] as const;

const RULES = [
  { icon: KeyRound, text: "Every tenant-owned record carries tenantId — no exceptions." },
  { icon: Workflow, text: "tenantId is resolved server-side from host or session, never trusted from the client." },
  { icon: Users, text: "Frontend filtering is not security. The backend enforces isolation on every request." },
];

export function Tenancy() {
  return (
    <section id="tenancy" className="scroll-mt-16 border-b border-line bg-panel">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading index="02" eyebrow="Multi-tenant model" title="Many companies. One truth. Zero leakage.">
          A tenant is one logistics company. One application and one shared
          database serve all of them — isolation is structural, not cosmetic.
        </SectionHeading>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* resolution terminal */}
          <div className="border border-line bg-ink">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
                Tenant resolution — concept, wired in Phase 04
              </span>
              <span className="font-mono text-[10px] text-signal">RESOLVE</span>
            </div>
            <div className="divide-y divide-line">
              {RESOLUTION_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-start gap-4 px-5 py-4">
                  <span className="mt-0.5 font-mono text-[10px] text-dim">0{i + 1}</span>
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.25em] text-signal">{step.label}</p>
                    <p className="mt-1 font-mono text-[13px] text-paper/90">{step.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-4">
              <p className="text-xs leading-5 text-dim">
                Reserved:{" "}
                <code className="font-mono text-paper/80">admin.yourplatform.com</code> — the
                platform owner control plane. V1 supports subdomains only.
              </p>
            </div>
          </div>

          {/* rules + user layers */}
          <div className="flex flex-col gap-8">
            <ul className="space-y-4">
              {RULES.map((rule) => (
                <li key={rule.text} className="flex items-start gap-3.5">
                  <rule.icon className="mt-0.5 h-4 w-4 shrink-0 text-signal" strokeWidth={1.5} />
                  <p className="text-sm leading-6 text-fog">{rule.text}</p>
                </li>
              ))}
            </ul>

            <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
              {USER_LAYERS.map((layer) => (
                <div key={layer.role} className="bg-ink p-5">
                  <layer.icon className="h-4 w-4 text-fog" strokeWidth={1.5} />
                  <h3 className="mt-3 text-sm font-semibold text-paper">{layer.role}</h3>
                  <p
                    className={`mt-1 font-mono text-[9.5px] tracking-[0.2em] uppercase ${
                      layer.account === "NO account" ? "text-signal" : "text-dim"
                    }`}
                  >
                    {layer.account}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-dim">{layer.scope}</p>
                </div>
              ))}
            </div>

            <p className="border-l-2 border-signal pl-4 text-xs leading-5 text-fog">
              Locked decision: there is deliberately{" "}
              <span className="text-paper">no Customer entity</span>. Customers are
              anonymous visitors with a tracking ID — no accounts, no customer table.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
