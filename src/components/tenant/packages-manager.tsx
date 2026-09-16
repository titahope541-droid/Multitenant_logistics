"use client";

/**
 * Package list — search, status filter, archive drawer, pagination.
 * Server-scoped to the authenticated tenant; archived packages are hidden
 * until explicitly requested.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, PlusCircle, Search } from "lucide-react";
import { CopyLinkIconButton } from "@/components/shared/share-actions";
import {
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingState,
  Mono,
  StatusBadge,
  TableShell,
  Td,
  Th,
  buttonClasses,
} from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import { listPackages } from "@/services/packages";
import { cn } from "@/lib/utils";
import { PACKAGE_STATUS_FILTERS, type AdminPackageListItem, type PackageStatusFilter } from "@/types/package";

const FILTER_LABELS: Record<PackageStatusFilter, string> = {
  ALL: "All",
  PENDING: "Pending",
  PROCESSED: "Processed",
  IN_TRANSIT: "In Transit",
  ARRIVED_AT_FACILITY: "At Facility",
  DELIVERED: "Delivered",
};

export function PackagesManager({ slug }: { slug: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PackageStatusFilter>("ALL");
  const [archivedView, setArchivedView] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminPackageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPackages({
        search: search || undefined,
        status: statusFilter,
        archived: archivedView ? true : undefined,
        page,
        limit: 10,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Could not load packages.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, archivedView, page]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search tracking ID, package, sender or receiver"
            aria-label="Search packages"
            className="pl-10"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setArchivedView((value) => !value);
          }}
          aria-pressed={archivedView}
          className={cn(
            buttonClasses(archivedView ? "primary" : "secondary"),
            "shrink-0 whitespace-nowrap",
          )}
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          {archivedView ? "Viewing archive" : "Archive"}
        </button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {PACKAGE_STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => {
              setPage(1);
              setStatusFilter(filter);
            }}
            aria-pressed={statusFilter === filter}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              statusFilter === filter
                ? "border-slate bg-slate text-white"
                : "border-hair-strong bg-surface text-body hover:border-muted hover:text-slate",
            )}
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {archivedView ? (
        <p className="rounded-lg border border-warn/20 bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
          Archived packages keep their tracking ID and full history. Restore one from its detail
          page to make changes again.
        </p>
      ) : null}

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card>
        {loading ? (
          <LoadingState label="Loading packages…" />
        ) : items.length === 0 ? (
          <EmptyState
            title={archivedView ? "The archive is empty" : "No packages match"}
            description={
              archivedView
                ? "Packages you archive will appear here."
                : "Adjust your search or filters, or create a new shipment."
            }
            action={
              archivedView ? undefined : (
                <Link href="/dashboard/packages/new" className={buttonClasses("primary")}>
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Create package
                </Link>
              )
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
                <Th className="hidden lg:table-cell">Created</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((pkg) => (
                <tr
                  key={pkg.id}
                  className={cn("transition-colors hover:bg-surface-2", pkg.archived && "opacity-70")}
                >
                  <Td>
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/packages/${pkg.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        <Mono>{pkg.trackingId}</Mono>
                      </Link>
                      <CopyLinkIconButton trackingId={pkg.trackingId} slug={slug} />
                    </span>
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
                    {new Date(pkg.createdAt).toLocaleDateString()}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
        <span>
          {total} package{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1 || loading}
            className={buttonClasses("secondary", "sm")}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages || loading}
            className={buttonClasses("secondary", "sm")}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
