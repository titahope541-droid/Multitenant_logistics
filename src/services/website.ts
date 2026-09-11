/**
 * Website configuration service (browser side) — Platform Admin only.
 * The server enforces the PLATFORM_ADMIN gate regardless of UI state.
 */

import { apiClient } from "@/services/api-client";
import type { PublicWebsiteData, WebsiteBranding, WebsiteConfigDraft } from "@/types/website";
import type { PlatformStats, TenantPackageSummary, Paginated } from "@/types/tenant";

export function getWebsiteConfig(tenantId: string): Promise<PublicWebsiteData> {
  return apiClient.get<PublicWebsiteData>(`/platform/tenants/${tenantId}/website`);
}

export function saveWebsiteConfig(
  tenantId: string,
  draft: WebsiteConfigDraft,
): Promise<PublicWebsiteData> {
  return apiClient.patch<PublicWebsiteData>(`/platform/tenants/${tenantId}/website`, draft);
}

export function saveBranding(
  tenantId: string,
  branding: Partial<WebsiteBranding>,
): Promise<{ branding: WebsiteBranding }> {
  return apiClient.patch<{ branding: WebsiteBranding }>(
    `/platform/tenants/${tenantId}/branding`,
    branding,
  );
}

export function getPlatformStats(): Promise<PlatformStats> {
  return apiClient.get<PlatformStats>("/platform/stats");
}

export function listTenantPackages(
  tenantId: string,
  page = 1,
): Promise<Paginated<TenantPackageSummary>> {
  return apiClient.get<Paginated<TenantPackageSummary>>(
    `/platform/tenants/${tenantId}/packages?page=${page}&limit=10`,
  );
}
