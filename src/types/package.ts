/**
 * Package DTOs — the exact shapes the tenant-admin API returns and the
 * /dashboard console consumes. Browser-safe (pure types).
 *
 * PUBLIC tracking (later phase) builds its own deliberately smaller
 * projection — it never reuses these admin shapes.
 */

import type { PackageStatus, PaymentStatus } from "@/types/domain";

export interface PartyDetailsDto {
  name: string;
  phone: string;
  email?: string;
  address: string;
}

export interface CurrentLocationDto {
  latitude: number;
  longitude: number;
  locationName?: string;
  updatedAt: string;
}

export interface AdminPackageListItem {
  id: string;
  trackingId: string;
  packageName: string;
  status: PackageStatus;
  archived: boolean;
  senderName: string;
  receiverName: string;
  currentLocationName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  status: PackageStatus;
  note?: string;
  occurredAt: string;
}

export interface LocationHistoryEntry {
  latitude: number;
  longitude: number;
  locationName?: string;
  recordedAt: string;
}

export interface AdminPackageDetails {
  id: string;
  trackingId: string;
  packageName: string;
  description?: string;
  status: PackageStatus;
  archived: boolean;
  sender: PartyDetailsDto;
  receiver: PartyDetailsDto;
  specifications: { size?: string; weight?: number };
  payment: { paymentMethod?: string; paymentStatus: PaymentStatus; shippingCost: number };
  delivery: { estimatedDeliveryDate?: string };
  currentLocation: CurrentLocationDto | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
  locationHistory: LocationHistoryEntry[];
}

export interface CreatedPackageResult {
  package: AdminPackageDetails;
  trackingId: string;
}

/** Create payload accepted by the API (client-side typing only; the zod
 *  boundary on the server is authoritative). tenantId and trackingId are
 *  deliberately absent — both are server-owned. */
export interface CreatePackagePayload {
  packageName: string;
  description?: string;
  sender: PartyDetailsDto;
  receiver: PartyDetailsDto;
  specifications?: { size?: string; weight?: number };
  payment?: { paymentMethod?: string; paymentStatus?: PaymentStatus; shippingCost?: number };
  delivery?: { estimatedDeliveryDate?: string };
  currentLocation?: { latitude: number; longitude: number; locationName?: string };
}

/** Archived handling for the list: default excludes archived; the explicit
 *  `archived=true` query reads the archive drawer. */
export const PACKAGE_STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "PROCESSED",
  "IN_TRANSIT",
  "ARRIVED_AT_FACILITY",
  "DELIVERED",
] as const;
export type PackageStatusFilter = (typeof PACKAGE_STATUS_FILTERS)[number];

export interface ListPackagesQuery {
  search?: string;
  status?: PackageStatusFilter;
  archived?: boolean;
  page?: number;
  limit?: number;
}
