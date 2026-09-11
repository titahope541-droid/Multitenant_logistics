"use client";

/**
 * Platform admin tenant manager — the /admin/tenants surface.
 * Search (debounced) · status filter · sort · pagination · lifecycle
 * actions with confirm · details drawer · reset password (one-time reveal).
 * Every operation calls the guarded platform API; the server owns the rules.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, KeyRound, Loader2, Plus, RotateCcw, Search, X } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import * as tenants from "@/services/tenants";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CredentialsDisplay } from "@/components/admin/credentials-display";
import { CreateTenantWizard } from "@/components/admin/create-tenant-wizard";
import { cn } from "@/lib/utils";
import { TENANT_STATUS_FILTERS, TENANT_SORTS, type TenantDetails, type TenantListItem, type TenantSort, type TenantStatusFilter } from "@/types/tenant";
import type { TenantStatus } from "@/types/domain";

const SORT_LABELS: Record<TenantSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  most_packages: "Most packages",
  company_name: "Company name",
};

function StatusBadge({ status }: { status: TenantStatus }) {
  const meta: Record<TenantStatus, string> = {
    ACTIVE: "border-mint/40 text-mint",
    SUSPENDED: "border-amber/40 text-amber",
    ARCHIVED: "border-line text-dim",
  };
  return (
    <span className={cn("inline-block border px-2 py-0.5 font-mono text-[9px] tracking-[0.18em]", meta[status])}>
      {status}
    </span>
  );
}

function describeError(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "Unexpected error.";
}

export function TenantsManager() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>("ALL");
  const [sort, setSort] = useState<TenantSort>("newest");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TenantListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [details, setDetails] = useState<TenantDetails | null>(null);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [resetResult, setResetResult] = useState<{ admin: string; temporaryPassword: string } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await tenants.listTenants({
        search: search || undefined,
        status: statusFilter,
        sort,
        page,
        limit: 10,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort, page]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void load(), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [load]);

  function mutate(action: () => Promise<unknown>) {
    return async () => {
      try {
        await action();
        await load();
        if (details) await openDetails(details.tenant.id);
      } catch (cause) {
        setError(describeError(cause));
      }
    };
  }

  async function openDetails(tenantId: string) {
    setDetailsBusy(true);
    try {
      setDetails(await tenants.getTenantDetails(tenantId));
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setDetailsBusy(false);
    }
  }

  function lifecycleButtons(tenant: { id: string; status: TenantStatus }) {
    if (tenant.status === "ACTIVE") {
      return (
        <>
          <ConfirmButton confirmLabel="Confirm suspend" onConfirm={mutate(() => tenants.suspendTenant(tenant.id))}>
            Suspend
          </ConfirmButton>
          <ConfirmButton confirmLabel="Confirm archive" tone="danger" onConfirm={mutate(() => tenants.archiveTenant(tenant.id))}>
            Archive
          </ConfirmButton>
        </>
      );
    }
    return (
      <ConfirmButton confirmLabel="Confirm restore" onConfirm={mutate(() => tenants.restoreTenant(tenant.id))}>
        <RotateCcw className="h-3 w-3" /> Restore
      </ConfirmButton>
    );
  }

  return (
    <div className="space-y-6">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search company, subdomain, admin…"
            className="w-full border border-line bg-panel py-2.5 pr-3 pl-9 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal"
          />
        </div>
        <div className="flex gap-px border border-line bg-line">
          {TENANT_STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setPage(1);
                setStatusFilter(filter);
              }}
              className={cn(
                "px-3 py-2 font-mono text-[10px] tracking-[0.15em] uppercase transition-colors",
                statusFilter === filter ? "bg-paper text-ink" : "bg-panel text-fog hover:text-paper",
              )}
            >
              {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as TenantSort)}
          aria-label="Sort tenants"
          className="border border-line bg-panel px-3 py-2.5 font-mono text-[11px] text-fog outline-none focus:border-signal"
        >
          {TENANT_SORTS.map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowCreate((value) => !value)}
          className="inline-flex items-center gap-2 border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal"
        >
          <Plus className="h-3.5 w-3.5" />
          {showCreate ? "Close" : "New tenant"}
        </button>
      </div>

      {showCreate ? <CreateTenantWizard onCreated={() => void load()} /> : null}

      {error ? (
        <p role="alert" className="border-l-2 border-crimson px-3 py-2 font-mono text-[11px] text-crimson">
          {error}
        </p>
      ) : null}

      {/* table */}
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-panel text-left">
              {["Company", "Subdomain", "Status", "Admin", "Packages", "Created", "Actions"].map((head) => (
                <th key={head} className="px-4 py-3 font-mono text-[9.5px] font-medium tracking-[0.2em] text-dim uppercase">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((tenant) => (
              <tr key={tenant.id} className="border-b border-line transition-colors last:border-b-0 hover:bg-panel">
                <td className="px-4 py-3">
                  <Link href={`/admin/tenants/${tenant.id}`} className="flex items-center gap-3 text-left">
                    <Building2 className="h-4 w-4 shrink-0 text-dim" strokeWidth={1.5} />
                    <span className="font-medium text-paper underline decoration-line underline-offset-4 hover:decoration-signal">
                      {tenant.companyName}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-fog">{tenant.slug}.yourplatform.com</td>
                <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
                <td className="px-4 py-3 font-mono text-[12px]">{tenant.admin ? (<span className="text-fog">{tenant.admin.name} <span className="text-dim">· {tenant.admin.email}</span></span>) : <span className="text-dim">—</span>}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-paper">{tenant.packageCount}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-dim">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.15em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => void openDetails(tenant.id)}
                      className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.15em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper"
                    >
                      Quick view
                    </button>
                    {lifecycleButtons(tenant)}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
                  No tenants match — adjust the search or filters, or create the first tenant.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {loading ? (
          <div className="flex items-center justify-center gap-2 border-t border-line py-4 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tenants
          </div>
        ) : null}
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-dim uppercase">
        <span>
          {total} tenant{total === 1 ? "" : "s"} · page {page} / {totalPages}
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

      {/* details drawer */}
      {details ? (
        <aside className="border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="font-mono text-[10px] tracking-[0.25em] text-signal uppercase">
              Tenant details — {details.tenant.slug}.yourplatform.com
            </span>
            <button onClick={() => { setDetails(null); setResetResult(null); }} aria-label="Close details" className="text-dim transition-colors hover:text-paper">
              <X className="h-4 w-4" />
            </button>
          </div>
          {detailsBusy ? (
            <div className="flex items-center gap-2 px-5 py-6 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
            </div>
          ) : (
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-mono text-[12px]">
                <dt className="text-dim">company</dt><dd className="text-paper">{details.tenant.companyName}</dd>
                <dt className="text-dim">status</dt><dd><StatusBadge status={details.tenant.status} /></dd>
                <dt className="text-dim">packages</dt><dd className="text-paper">{details.packageCount}</dd>
                <dt className="text-dim">created</dt><dd className="text-paper">{new Date(details.tenant.createdAt).toLocaleString()}</dd>
                <dt className="text-dim">updated</dt><dd className="text-paper">{new Date(details.tenant.updatedAt).toLocaleString()}</dd>
                <dt className="text-dim">website</dt><dd className="text-paper">{details.websiteConfigured ? "configured" : "missing config"}</dd>
                {details.tenant.contact.phone ? (<><dt className="text-dim">phone</dt><dd className="text-paper">{details.tenant.contact.phone}</dd></>) : null}
                {details.tenant.contact.email ? (<><dt className="text-dim">email</dt><dd className="text-paper">{details.tenant.contact.email}</dd></>) : null}
                {details.tenant.contact.address ? (<><dt className="text-dim">address</dt><dd className="text-paper">{details.tenant.contact.address}</dd></>) : null}
              </dl>
              <div>
                <p className="mb-3 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">Tenant admin</p>
                {details.admin ? (
                  <div className="space-y-3">
                    <p className="font-mono text-[12px] text-paper">
                      {details.admin.name} <span className="text-dim">· {details.admin.email}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lifecycleButtons({ id: details.tenant.id, status: details.tenant.status })}
                      <ConfirmButton
                        confirmLabel="Confirm reset"
                        tone="danger"
                        onConfirm={mutate(async () => {
                          const result = await tenants.resetTenantAdminPassword(details.tenant.id);
                          setResetResult({ admin: result.admin.email, temporaryPassword: result.temporaryPassword });
                        })}
                      >
                        <KeyRound className="h-3 w-3" /> Reset admin password
                      </ConfirmButton>
                    </div>
                    {resetResult ? (
                      <CredentialsDisplay
                        title="Password reset — one-time credentials"
                        rows={[{ label: "admin email", value: resetResult.admin }]}
                        temporaryPassword={resetResult.temporaryPassword}
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="font-mono text-[11px] text-dim">No tenant admin on record.</p>
                )}
              </div>
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}
