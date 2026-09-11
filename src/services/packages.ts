/**
 * Packages service (browser side) — typed functions over the tenant-admin
 * package API. Consumed by the /dashboard console.
 */

import { apiClient } from "@/services/api-client";
import type { PackageStatus } from "@/types/domain";
import type {
  AdminPackageDetails,
  AdminPackageListItem,
  CreatePackagePayload,
  ListPackagesQuery,
} from "@/types/package";
import type { Paginated } from "@/types/tenant";

export function listPackages(query: ListPackagesQuery = {}): Promise<Paginated<AdminPackageListItem>> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.archived) params.set("archived", "true");
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return apiClient.get<Paginated<AdminPackageListItem>>(`/admin/packages${suffix}`);
}

export function createPackage(payload: CreatePackagePayload): Promise<AdminPackageDetails> {
  return apiClient.post<AdminPackageDetails>("/admin/packages", payload);
}

export function getPackageDetails(packageId: string): Promise<AdminPackageDetails> {
  return apiClient.get<AdminPackageDetails>(`/admin/packages/${packageId}`);
}

export function changePackageStatus(
  packageId: string,
  input: { status: PackageStatus; note?: string },
): Promise<AdminPackageDetails> {
  return apiClient.patch<AdminPackageDetails>(`/admin/packages/${packageId}/status`, input);
}

export function updatePackageLocation(
  packageId: string,
  input: { latitude: number; longitude: number; locationName?: string },
): Promise<AdminPackageDetails> {
  return apiClient.patch<AdminPackageDetails>(`/admin/packages/${packageId}/location`, input);
}

export function archivePackage(packageId: string): Promise<AdminPackageDetails> {
  return apiClient.post<AdminPackageDetails>(`/admin/packages/${packageId}/archive`, {});
}

export function restorePackage(packageId: string): Promise<AdminPackageDetails> {
  return apiClient.post<AdminPackageDetails>(`/admin/packages/${packageId}/restore`, {});
}
