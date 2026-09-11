import type { Metadata } from "next";
import Link from "next/link";
import { Archive, ArrowUpRight, Building2, CheckCircle2, Layers, PackageCheck, PauseCircle, Truck } from "lucide-react";
import { requirePageRole } from "@/server/middleware/page-auth";
import { getPlatformStats } from "@/server/services/tenant.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  await requirePageRole("PLATFORM_ADMIN");
  const stats = await getPlatformStats();

  const tenantCards = [
    { label: "Total tenants", value: stats.tenants.total, icon: Building2 },
    { label: "Active", value: stats.tenants.active, icon: Layers },
    { label: "Suspended", value: stats.tenants.suspended, icon: PauseCircle },
    { label: "Archived", value: stats.tenants.archived, icon: Archive },
  ];
  const packageCards = [
    { label: "Total packages", value: stats.packages.total, icon: PackageCheck },
    { label: "Active shipments", value: stats.packages.activeShipments, icon: Truck },
    { label: "Delivered", value: stats.packages.delivered, icon: CheckCircle2 },
  ];

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
        Control plane — overview
      </p>
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-paper">The platform at a glance.</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-fog">
        Companies operated on this instance and the shipments moving
        through them. Provisioning is atomic: company, tenant admin, and
        website configuration are created as one unit.
      </p>

      <h2 className="mt-10 mb-3 font-mono text-[10px] tracking-[0.25em] text-dim uppercase">Tenants</h2>
      <dl className="grid grid-cols-2 border border-line bg-panel lg:grid-cols-4">
        {tenantCards.map((card) => (
          <div key={card.label} className="border-r border-line px-5 py-6 last:border-r-0 sm:px-6">
            <dt className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              <card.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {card.label}
            </dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight text-paper">{card.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 mb-3 font-mono text-[10px] tracking-[0.25em] text-dim uppercase">Shipments</h2>
      <dl className="grid grid-cols-1 border border-line bg-panel sm:grid-cols-3">
        {packageCards.map((card) => (
          <div key={card.label} className="border-b border-line px-5 py-6 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 sm:px-6">
            <dt className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              <card.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {card.label}
            </dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight text-paper">{card.value}</dd>
          </div>
        ))}
      </dl>

      <Link
        href="/admin/tenants"
        className="group mt-8 inline-flex items-center gap-2 border border-paper/25 bg-paper px-5 py-3 font-mono text-[11px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal"
      >
        Manage tenants
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
}
