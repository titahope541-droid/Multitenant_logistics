/**
 * Domain contracts — shared, pure TypeScript.
 *
 * This module pins decisions that must mirror docs and the Mongoose schemas
 * exactly — above all the FIVE LOCKED PACKAGE STATUSES (locked decision).
 * Mongoose enums, zod validators, API payloads, realtime contracts, and UI
 * all derive from these single definitions.
 *
 * Tenant/User/Package wire shapes are IMPLEMENTED as Mongoose models in
 * Phase 2 (src/db/models, docs/database.md). Shapes belonging to future
 * phases remain marked PLANNED — NOT IMPLEMENTED.
 */

/* ── The five locked package statuses. Exactly these. In this order. ─────── */

export const PACKAGE_STATUSES = [
  "PENDING",
  "PROCESSED",
  "IN_TRANSIT",
  "ARRIVED_AT_FACILITY",
  "DELIVERED",
] as const;

export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export interface PackageStatusMeta {
  label: string;
  /** Position in the lifecycle, 1-based. Used by timelines. */
  step: number;
  /** Semantic tone for UI presentation. */
  tone: "idle" | "active" | "moving" | "hub" | "done";
}

export const PACKAGE_STATUS_META: Record<PackageStatus, PackageStatusMeta> = {
  PENDING: { label: "Pending", step: 1, tone: "idle" },
  PROCESSED: { label: "Processed", step: 2, tone: "active" },
  IN_TRANSIT: { label: "In Transit", step: 3, tone: "moving" },
  ARRIVED_AT_FACILITY: { label: "Arrived at Facility", step: 4, tone: "hub" },
  DELIVERED: { label: "Delivered", step: 5, tone: "done" },
};

export function isPackageStatus(value: unknown): value is PackageStatus {
  return typeof value === "string" && (PACKAGE_STATUSES as readonly string[]).includes(value);
}

/* ── Tenant lifecycle (IMPLEMENTed Phase 2 — do not extend) ──────────────── */

export const TENANT_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

/* ── User roles and account status (implemented Phase 2) ─────────────────── */

export const USER_ROLES = ["PLATFORM_ADMIN", "TENANT_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];
/*
 * There are deliberately ONLY these two roles — no STAFF, MANAGER, DRIVER,
 * SUPER_ADMIN, or CUSTOMER roles. Customers have no accounts at all.
 */

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * SafeUser — the ONLY user shape ever sent to clients (Phase 3).
 * Built by toSafeUser() in the auth service from a User document.
 * passwordHash, session internals, and status mechanics never leave the server.
 */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Null for PLATFORM_ADMIN. */
  tenantId: string | null;
}

/* ── Package payment status (implemented Phase 2) ──────────────────────────
 * NB: payment METHOD is free text on purpose — no method enum exists.     */

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/* ── Tenant identity (implemented Phase 2 as the Tenant mongoose model) ───── */

export interface TenantContact {
  phone: string;
  email: string;
  address: string;
}

/** One logistics company on the platform. Identity only — website
 *  configuration lives separately in WebsiteConfig. */
export interface Tenant {
  id: string;
  /** Subdomain slug: `swift.yourplatform.com` → "swift". Globally unique. */
  slug: string;
  companyName: string;
  status: TenantStatus;
  contact: TenantContact;
}

/* ── Public tracking projection (IMPLEMENTED Phase 6) ──────────────────────
 * THE PUBLIC ALLOWLIST. This is the only package shape an unauthenticated
 * visitor may ever see. Phones, emails, full addresses, payment metadata,
 * shipping cost, tenant ids, database ids, and location history are all
 * deliberately absent — building anything wider is a security change, not
 * a feature change (docs/public-tracking.md §allowlist).
 * ─────────────────────────────────────────────────────────────────────────── */

export interface PublicTrackingEvent {
  status: PackageStatus;
  note?: string;
  occurredAt: string;
}

export interface PublicTrackingResult {
  trackingId: string;
  packageName: string;
  /** Names only — never phones/emails/addresses. */
  senderName: string;
  receiverName: string;
  estimatedDelivery?: string;
  status: PackageStatus;
  lastUpdated: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    locationName?: string;
    updatedAt: string;
  } | null;
  timeline: PublicTrackingEvent[];
}
