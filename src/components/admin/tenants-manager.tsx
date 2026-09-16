"use client";

/**
 * Platform tenant list — server-side search, status filter, sorting and
 * pagination. Row actions live in a compact three-dot menu (with explicit
 * confirmation for lifecycle changes) instead of a row full of buttons.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { CreateTenantWizard } from "@/components/admin/create-tenant-wizard";
import { TenantActions } from "@/components/admin/tenant-actions";
import {
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Mono,
  Select,
  TableShell,
  Td,
  TenantStatusBadge,
  Th,
  buttonClasses,
} from "@/components/ui";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/services/api-client";
import * as tenants from "@/services/tenants";
import { cn } from "@/lib/utils";
import {
  TENANT_SORTS,
  TENANT_STATUS_FILTERS,
  type TenantListItem,
  type TenantSort,
  type TenantStatusFilter,
} from "@/types/tenant";

const SORT_LABELS: Record<TenantSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  most_packages: "Most packages",
  company_name: "Company name",
};

const FILTER_LABELS: Record<TenantStatusFilter, string> = {
  ALL: "All",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

export function TenantsManager({ platformDomain }: { platformDomain: string }) {
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setError(cause instanceof ApiClientError ? cause.message : "Could not load tenants.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort, page]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return (
    <div className="space-y-5">
      {/* Compact search / sort / create header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
            placeholder="Search company, subdomain, or tenant admin"
            aria-label="Search tenants"
            className="pl-10"
          />
        </div>
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as TenantSort)}
          aria-label="Sort tenants"
          className="lg:w-52"
        >
          {TENANT_SORTS.map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className={cn(buttonClasses("primary"), "shrink-0")}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showCreate ? "Close" : "New tenant"}
        </button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {TENANT_STATUS_FILTERS.map((filter) => (
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

      {showCreate ? <CreateTenantWizard onCreated={() => void load()} /> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No tenants match"
            description="Adjust your search or filters, or provision the first company."
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
              {items.map((tenant) => (
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
                      {tenant.slug}.{platformDomain}
                    </span>
                  </Td>
                  <Td className="hidden lg:table-cell">
                    <Mono className="text-body">
                      {tenant.slug}.{platformDomain}
                    </Mono>
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
        <span>
          {total} tenant{total === 1 ? "" : "s"} · page {page} of {totalPages}
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
