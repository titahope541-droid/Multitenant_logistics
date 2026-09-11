"use client";

/**
 * Tenant package manager — /dashboard/packages surface.
 * Search (debounced) · exact status filters · archive drawer · pagination.
 * The server scopes everything to the authenticated tenant.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, Loader2, Package, Search } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import { listPackages } from "@/services/packages";
import { CopyLinkIconButton } from "@/components/shared/share-actions";
import { StatusBadge } from "@/components/tenant/status-badge";
import { cn } from "@/lib/utils";
import { PACKAGE_STATUS_META } from "@/types/domain";
import type { AdminPackageListItem, PackageStatusFilter } from "@/types/package";
import { PACKAGE_STATUS_FILTERS } from "@/types/package";

const FILTER_LABELS: Record<PackageStatusFilter, string> = {
  ALL: "All",
  PENDING: "Pending",
  PROCESSED: "Processed",
  IN_TRANSIT: "In Transit",
  ARRIVED_AT_FACILITY: "Arrived at Facility",
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
      setError(cause instanceof ApiClientError ? cause.message : "Unexpected error.");
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search tracking ID, package, sender, receiver…"
            className="w-full border border-line bg-panel py-2.5 pr-3 pl-9 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal"
          />
        </div>
        <button
          onClick={() => {
            setPage(1);
            setArchivedView((value) => !value);
          }}
          className={cn(
            "inline-flex items-center gap-2 border px-4 py-2.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors",
            archivedView
              ? "border-amber/50 text-amber"
              : "border-line text-fog hover:border-paper/40 hover:text-paper",
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {archivedView ? "Archive drawer: ON" : "Archive drawer"}
        </button>
      </div>

      <div className="flex flex-wrap gap-px border border-line bg-line">
        {PACKAGE_STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setPage(1);
              setStatusFilter(filter);
            }}
            className={cn(
              "px-3 py-2 font-mono text-[10px] tracking-[0.13em] uppercase transition-colors",
              statusFilter === filter ? "bg-paper text-ink" : "bg-panel text-fog hover:text-paper",
            )}
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {archivedView ? (
        <p className="border-l-2 border-amber px-3 py-2 font-mono text-[10.5px] leading-4 text-amber">
          Archive drawer — archived packages are retained with full history.
          Restore one from its details page to work on it again.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] text-crimson">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left">
              {["Tracking ID", "Package", "Status", "Receiver", "Location", "Created"].map((head) => (
                <th key={head} className="px-4 py-3 font-mono text-[9.5px] font-medium tracking-[0.2em] text-dim uppercase">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((pkg) => (
              <tr key={pkg.id} className={cn("border-b border-line transition-colors last:border-b-0 hover:bg-panel", pkg.archived && "opacity-60")}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <Link href={`/dashboard/packages/${pkg.id}`} className="font-mono text-[12px] text-signal underline decoration-line underline-offset-4 hover:decoration-signal">
                      {pkg.trackingId}
                    </Link>
                    <CopyLinkIconButton trackingId={pkg.trackingId} slug={slug} />
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5 text-paper">
                    <Package className="h-3.5 w-3.5 shrink-0 text-dim" strokeWidth={1.5} />
                    {pkg.packageName}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status={pkg.status} /></td>
                <td className="px-4 py-3 font-mono text-[12px] text-fog">{pkg.receiverName}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-dim">{pkg.currentLocationName ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-dim">{new Date(pkg.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
                  {archivedView
                    ? "Archive drawer is empty."
                    : "No packages match — adjust filters, or create the first package."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line py-4 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading packages
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-dim uppercase">
        <span>
          {total} package{total === 1 ? "" : "s"} · page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="border border-line px-3 py-1.5 transition-colors hover:border-paper/40 hover:text-paper disabled:opacity-40">
            Prev
          </button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="border border-line px-3 py-1.5 transition-colors hover:border-paper/40 hover:text-paper disabled:opacity-40">
            Next
          </button>
        </div>
      </div>

      <p className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">
        Statuses · {Object.values(PACKAGE_STATUS_META).map((meta) => meta.label).join(" → ")}
      </p>
    </div>
  );
}
