import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Package, PlusCircle, Truck } from "lucide-react";
import {
  Card,
  CardHeader,
  EmptyState,
  Mono,
  PageHeader,
  StatCard,
  StatusBadge,
  TableShell,
  Td,
  Th,
  buttonClasses,
} from "@/components/ui";
import { requirePageRole } from "@/server/middleware/page-auth";
import { listPackages } from "@/server/services/package.service";
import { PACKAGE_STATUSES } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function TenantDashboardPage() {
  const auth = await requirePageRole("TENANT_ADMIN");

  // Counts come from the same tenant-scoped service the API uses.
  const [recent, archived, ...byStatus] = await Promise.all([
    listPackages(auth, { page: 1, limit: 6 }),
    listPackages(auth, { page: 1, limit: 1, archived: true }),
    ...PACKAGE_STATUSES.map((status) => listPackages(auth, { page: 1, limit: 1, status })),
  ]);

  const counts = Object.fromEntries(
    PACKAGE_STATUSES.map((status, index) => [status, byStatus[index]?.total ?? 0]),
  ) as Record<(typeof PACKAGE_STATUSES)[number], number>;

  const inTransit = counts.IN_TRANSIT + counts.ARRIVED_AT_FACILITY;
  const awaiting = counts.PENDING + counts.PROCESSED;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of the shipments your company is moving."
        actions={
          <Link href="/dashboard/packages/new" className={buttonClasses("primary")}>
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Create package
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total packages"
          value={recent.total}
          hint={archived.total > 0 ? `${archived.total} archived` : "Active shipments"}
          tone="accent"
          icon={<Package className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="In transit"
          value={inTransit}
          hint="Moving or at a facility"
          tone="info"
          icon={<Truck className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Pending / processed"
          value={awaiting}
          hint="Awaiting dispatch"
          tone="warn"
          icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="Delivered"
          value={counts.DELIVERED}
          hint="Completed deliveries"
          tone="ok"
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent packages"
          description="Newest shipments first. Select one to update status or location."
          actions={
            <Link href="/dashboard/packages" className={buttonClasses("secondary", "sm")}>
              View all
            </Link>
          }
        />

        {recent.items.length === 0 ? (
          <EmptyState
            title="No packages yet"
            description="Create your first shipment to generate a tracking ID you can share with the customer."
            action={
              <Link href="/dashboard/packages/new" className={buttonClasses("primary")}>
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Create package
              </Link>
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Tracking ID</Th>
                <Th className="hidden sm:table-cell">Package</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Receiver</Th>
                <Th className="hidden lg:table-cell">Location</Th>
                <Th className="hidden lg:table-cell">Updated</Th>
              </tr>
            </thead>
            <tbody>
              {recent.items.map((pkg) => (
                <tr key={pkg.id} className="transition-colors hover:bg-surface-2">
                  <Td>
                    <Link
                      href={`/dashboard/packages/${pkg.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      <Mono>{pkg.trackingId}</Mono>
                    </Link>
                    <span className="mt-0.5 block text-[12px] text-muted sm:hidden">
                      {pkg.packageName}
                    </span>
                  </Td>
                  <Td className="hidden text-slate sm:table-cell">{pkg.packageName}</Td>
                  <Td>
                    <StatusBadge status={pkg.status} />
                  </Td>
                  <Td className="hidden text-body md:table-cell">{pkg.receiverName}</Td>
                  <Td className="hidden text-body lg:table-cell">
                    {pkg.currentLocationName ?? <span className="text-muted">—</span>}
                  </Td>
                  <Td className="hidden text-muted lg:table-cell">
                    {new Date(pkg.updatedAt).toLocaleDateString()}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <p className="mt-5 text-[12.5px] text-muted">
        Customers follow these shipments live on your public tracking page — no account needed.
      </p>
    </>
  );
}
