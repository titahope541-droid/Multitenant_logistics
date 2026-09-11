import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { requirePageRole } from "@/server/middleware/page-auth";
import { listPackages } from "@/server/services/package.service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TenantDashboardPage() {
  const auth = await requirePageRole("TENANT_ADMIN");
  const [active, archived, recent] = await Promise.all([
    listPackages(auth, { page: 1, limit: 1 }),
    listPackages(auth, { page: 1, limit: 1, archived: true }),
    listPackages(auth, { page: 1, limit: 5 }),
  ]);

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
        Operations — overview
      </p>
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-paper">
        Shipments under your fleet.
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-fog">
        Every package carries a server-generated, globally unique tracking
        ID — send it to your customer. Statuses and locations append
        history; nothing is ever overwritten.
      </p>

      <dl className="mt-10 grid grid-cols-2 border border-line bg-panel lg:grid-cols-3">
        <div className="border-r border-line px-5 py-6 sm:px-6">
          <dt className="font-mono text-[10px] tracking-[0.2em] text-dim uppercase">Active packages</dt>
          <dd className="mt-2 text-3xl font-semibold text-paper">{active.total}</dd>
        </div>
        <div className="border-r border-line px-5 py-6 sm:px-6">
          <dt className="font-mono text-[10px] tracking-[0.2em] text-dim uppercase">Archived</dt>
          <dd className="mt-2 text-3xl font-semibold text-fog">{archived.total}</dd>
        </div>
        <div className="px-5 py-6 sm:px-6">
          <dt className="font-mono text-[10px] tracking-[0.2em] text-dim uppercase">In list — latest</dt>
          <dd className="mt-2 truncate font-mono text-[13px] text-paper">
            {recent.items[0]?.trackingId ?? "no packages yet"}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/dashboard/packages/new"
          className="group inline-flex items-center gap-2 border border-paper/25 bg-paper px-5 py-3 font-mono text-[11px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal"
        >
          <Package className="h-3.5 w-3.5" />
          Create package
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <Link
          href="/dashboard/packages"
          className="inline-flex items-center gap-2 border border-line px-5 py-3 font-mono text-[11px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
        >
          All packages
        </Link>
      </div>
    </div>
  );
}
