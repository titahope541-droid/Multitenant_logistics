/**
 * Tenants service (browser side) — typed functions over the platform
 * tenant-management API. Used by the /admin console. Platform Admin only;
 * the server enforces the role gate regardless of what UI shows.
 */

import { apiClient } from "@/services/api-client";
import type {
  ListTenantsQuery,
  Paginated,
  PasswordResetResult,
  TenantCreationResult,
  TenantDetails,
  TenantListItem,
} from "@/types/tenant";

export function listTenants(query: ListTenantsQuery = {}): Promise<Paginated<TenantListItem>> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return apiClient.get<Paginated<TenantListItem>>(`/platform/tenants${suffix}`);
}

export interface CreateTenantPayload {
  companyName: string;
  slug: string;
  contact?: { phone?: string; email?: string; address?: string };
  admin: { name: string; email: string; password?: string };
}

export function createTenant(payload: CreateTenantPayload): Promise<TenantCreationResult> {
  return apiClient.post<TenantCreationResult>("/platform/tenants", payload);
}

export function getTenantDetails(tenantId: string): Promise<TenantDetails> {
  return apiClient.get<TenantDetails>(`/platform/tenants/${tenantId}`);
}

export function updateTenant(
  tenantId: string,
  patch: { companyName?: string; slug?: string; contact?: { phone?: string; email?: string; address?: string } },
): Promise<TenantDetails> {
  return apiClient.patch<TenantDetails>(`/platform/tenants/${tenantId}`, patch);
}

export function suspendTenant(tenantId: string): Promise<TenantDetails> {
  return apiClient.post<TenantDetails>(`/platform/tenants/${tenantId}/suspend`, {});
}

export function archiveTenant(tenantId: string): Promise<TenantDetails> {
  return apiClient.post<TenantDetails>(`/platform/tenants/${tenantId}/archive`, {});
}

export function restoreTenant(tenantId: string): Promise<TenantDetails> {
  return apiClient.post<TenantDetails>(`/platform/tenants/${tenantId}/restore`, {});
}

export function resetTenantAdminPassword(tenantId: string): Promise<PasswordResetResult> {
  return apiClient.post<PasswordResetResult>(
    `/platform/tenants/${tenantId}/admin/reset-password`,
    {},
  );
}
