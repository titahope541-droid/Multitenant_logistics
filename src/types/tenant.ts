/**
 * Tenant-management DTOs — the exact shapes the platform API returns and
 * the admin console consumes. Browser-safe (pure types).
 *
 * These are deliberately NOT Mongoose documents: no password hashes, no
 * session data, no internal fields (docs/tenant-management.md).
 */

import type { TenantStatus, UserStatus } from "@/types/domain";

/* ── List querying ───────────────────────────────────────────────────────── */

/** "ALL" shows ACTIVE + SUSPENDED (archived tenants live behind their own filter). */
export type TenantStatusFilter = "ALL" | TenantStatus;

export const TENANT_STATUS_FILTERS = ["ALL", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export const TENANT_SORTS = ["newest", "oldest", "most_packages", "company_name"] as const;
export type TenantSort = (typeof TENANT_SORTS)[number];

export interface ListTenantsQuery {
  search?: string;
  status?: TenantStatusFilter;
  sort?: TenantSort;
  page?: number;
  limit?: number;
}

/* ── Outbound shapes ─────────────────────────────────────────────────────── */

export interface TenantAdminSummary {
  id: string;
  name: string;
  email: string;
}

export interface TenantListItem {
  id: string;
  companyName: string;
  slug: string;
  status: TenantStatus;
  admin: TenantAdminSummary | null;
  packageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TenantContactDetails {
  phone?: string;
  email?: string;
  address?: string;
}

export interface TenantDetails {
  tenant: {
    id: string;
    companyName: string;
    slug: string;
    status: TenantStatus;
    contact: TenantContactDetails;
    createdAt: string;
    updatedAt: string;
  };
  admin: (TenantAdminSummary & { status: UserStatus; createdAt: string }) | null;
  packageCount: number;
  /** False only if initialization was interrupted (self-healing exists). */
  websiteConfigured: boolean;
}

/** One-time credential disclosure — present ONLY when the server generated
 *  the password (creation or reset). Never retrievable afterwards. */
export interface TenantCreationResult {
  tenant: TenantDetails["tenant"];
  admin: TenantAdminSummary;
  temporaryPassword?: string;
}

export interface PasswordResetResult {
  admin: TenantAdminSummary;
  temporaryPassword: string;
}

/* ── Stats for the platform overview ─────────────────────────────────────── */

export interface TenantStats {
  total: number;
  active: number;
  suspended: number;
  archived: number;
}

/* ── Platform overview (Phase 8) ─────────────────────────────────────────── */

export interface PlatformStats {
  tenants: TenantStats;
  packages: {
    total: number;
    /** Everything not yet DELIVERED among the five locked statuses. */
    activeShipments: number;
    delivered: number;
  };
}

/** Read-only package row for the Platform Admin "open tenant dashboard" view. */
export interface TenantPackageSummary {
  id: string;
  trackingId: string;
  packageName: string;
  status: import("@/types/domain").PackageStatus;
  receiverName: string;
  currentLocationName: string | null;
  createdAt: string;
}
