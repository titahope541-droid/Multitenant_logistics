import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  Package,
  PauseCircle,
  Truck,
} from "lucide-react";
import { TenantActions } from "@/components/admin/tenant-actions";
import {
  Card,
  CardHeader,
  EmptyState,
  Mono,
  PageHeader,
  StatCard,
  TableShell,
  Td,
  TenantStatusBadge,
  Th,
  buttonClasses,
} from "@/components/ui";
import { requirePageRole } from "@/server/middleware/page-auth";
import { getPlatformStats, listTenants } from "@/server/services/tenant.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

function salutation(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AdminDashboardPage() {
  const auth = await requirePageRole("PLATFORM_ADMIN");

  // Real data only: platform metrics plus the newest tenants and the
  // busiest tenant, all through the same services the API uses.
  const [stats, recent, busiest] = await Promise.all([
    getPlatformStats(),
    listTenants({ page: 1, limit: 6, sort: "newest" }),
    listTenants({ page: 1, limit: 1, sort: "most_packages" }),
  ]);

  const firstName = auth.user.name.trim().split(/\s+/)[0] ?? auth.user.name;
  const totalTenants = Math.max(stats.tenants.total, 1);
  const distribution = [
    { label: "Active", value: stats.tenants.active, bar: "bg-ok", dot: "bg-ok" },
    { label: "Suspended", value: stats.tenants.suspended, bar: "bg-warn", dot: "bg-warn" },
    { label: "Archived", value: stats.tenants.archived, bar: "bg-muted", dot: "bg-muted" },
  ];
  const latest = recent.items[0];
  const busiestTenant = busiest.items[0];

  return (
    <>
      <PageHeader
        title={`${salutation()}, ${firstName}`}
        description="Here's an overview of your logistics platform."
        actions={
          <Link href="/admin/tenants" className={buttonClasses("primary")}>
            Manage tenants
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      {/* Tenant lifecycle metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total tenants"
          value={stats.tenants.total}
          tone="info"
          icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Active tenants"
          value={stats.tenants.active}
          hint="Website and tracking live"
          tone="ok"
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Suspended tenants"
          value={stats.tenants.suspended}
          hint="Public access disabled"
          tone="warn"
          icon={<PauseCircle className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Archived tenants"
          value={stats.tenants.archived}
          hint="Hidden, data retained"
          icon={<Archive className="h-4 w-4" strokeWidth={1.75} />}
        />
      </div>

      {/* Overview cards */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Platform overview"
            description="Tenant lifecycle distribution and shipment volume."
          />
          <div className="px-5 py-5 sm:px-6">
            {/* Distribution bar — derived from real counts */}
            <div
              className="flex h-2.5 overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`Tenant distribution: ${stats.tenants.active} active, ${stats.tenants.suspended} suspended, ${stats.tenants.archived} archived`}
            >
              {distribution
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <div
                    key={segment.label}
                    className={segment.bar}
                    style={{ width: `${(segment.value / totalTenants) * 100}%` }}
                  />
                ))}
            </div>

            <ul className="mt-4 space-y-2.5">
              {distribution.map((segment) => (
                <li
                  key={segment.label}
                  className="flex items-center justify-between gap-4 text-[13.5px]"
                >
                  <span className="flex items-center gap-2.5 text-body">
                    <span className={`h-2 w-2 rounded-full ${segment.dot}`} aria-hidden="true" />
                    {segment.label}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate">{segment.value}</span>
                    <span className="text-[12px] text-muted">
                      {Math.round((segment.value / totalTenants) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 grid gap-4 border-t border-hair pt-5 sm:grid-cols-3">
              {[
                { label: "Total packages", value: stats.packages.total },
                { label: "Active shipments", value: stats.packages.activeShipments },
                { label: "Delivered", value: stats.packages.delivered },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="flex items-center gap-2 text-[12.5px] text-muted">
                    {item.label === "Total packages" ? (
                      <Package className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    ) : item.label === "Active shipments" ? (
                      <Truck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    )}
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-[20px] font-semibold text-slate">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader title="Tenant overview" description="Newest and busiest companies." />
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {latest ? (
              <div>
                <p className="text-[12px] text-muted">Latest tenant</p>
                <Link
                  href={`/admin/tenants/${latest.id}`}
                  className="mt-1 block text-[14.5px] font-semibold text-slate hover:text-accent"
                >
                  {latest.companyName}
                </Link>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Created {new Date(latest.createdAt).toLocaleDateString()} · {latest.packageCount}{" "}
                  package{latest.packageCount === 1 ? "" : "s"}
                </p>
              </div>
            ) : null}

            {busiestTenant ? (
              <div className="border-t border-hair pt-4">
                <p className="text-[12px] text-muted">Most packages</p>
                <Link
                  href={`/admin/tenants/${busiestTenant.id}`}
                  className="mt-1 block text-[14.5px] font-semibold text-slate hover:text-accent"
                >
                  {busiestTenant.companyName}
                </Link>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {busiestTenant.packageCount} package
                  {busiestTenant.packageCount === 1 ? "" : "s"} on the platform
                </p>
              </div>
            ) : null}

            <div className="border-t border-hair pt-4">
              <p className="text-[12px] text-muted">In operation</p>
              <p className="mt-1 text-[14.5px] font-semibold text-slate">
                {stats.tenants.active} of {stats.tenants.total} tenants active
              </p>
            </div>

            {!latest ? (
              <p className="text-[13px] text-muted">
                No tenants yet — provision the first company from the Tenants page.
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Recent tenants */}
      <Card className="mt-6">
        <CardHeader
          title="Recent tenants"
          description="Newest companies on the platform."
          actions={
            <Link href="/admin/tenants" className={buttonClasses("secondary", "sm")}>
              View all
            </Link>
          }
        />
        {recent.items.length === 0 ? (
          <EmptyState
            title="No tenants yet"
            description="Provision your first logistics company to bring the platform online."
            action={
              <Link href="/admin/tenants" className={buttonClasses("primary")}>
                Create a tenant
              </Link>
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th className="hidden lg:table-cell">Subdomain</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Tenant admin</Th>
                <Th className="hidden sm:table-cell">Packages</Th>
                <Th className="hidden xl:table-cell">Created</Th>
                <Th className="w-10">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {recent.items.map((tenant) => (
                <tr key={tenant.id} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="flex items-center gap-2.5 font-medium text-slate hover:text-accent"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                        <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      {tenant.companyName}
                    </Link>
                    <span className="mt-0.5 block text-[12px] text-muted lg:hidden">
                      {tenant.slug}
                    </span>
                  </Td>
                  <Td className="hidden lg:table-cell">
                    <Mono className="text-body">{tenant.slug}</Mono>
                  </Td>
                  <Td>
                    <TenantStatusBadge status={tenant.status} />
                  </Td>
                  <Td className="hidden md:table-cell">
                    {tenant.admin ? (
                      <>
                        <span className="block text-slate">{tenant.admin.name}</span>
                        <span className="block text-[12px] text-muted">{tenant.admin.email}</span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td className="hidden text-slate sm:table-cell">{tenant.packageCount}</Td>
                  <Td className="hidden text-muted xl:table-cell">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </Td>
                  <Td>
                    <TenantActions
                      tenantId={tenant.id}
                      tenantName={tenant.companyName}
                      status={tenant.status}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </>
  );
}
