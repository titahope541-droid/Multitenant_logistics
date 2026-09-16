import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenantDetail } from "@/components/admin/tenant-detail";
import { OBJECT_ID_PATTERN } from "@/lib/validation-patterns";
import { getServerConfig } from "@/server/config/env";
import { requirePageRole } from "@/server/middleware/page-auth";
import { getTenantDetails } from "@/server/services/tenant.service";
import { getWebsiteConfig } from "@/server/services/website.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tenant" };

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePageRole("PLATFORM_ADMIN");
  const { tenantId } = await params;
  const { tab } = await searchParams;
  if (!OBJECT_ID_PATTERN.test(tenantId)) notFound();

  const [details, website] = await Promise.all([
    getTenantDetails(tenantId).catch(() => null),
    getWebsiteConfig(tenantId).catch(() => null),
  ]);
  if (!details || !website) notFound();

  return (
    <TenantDetail
      initialDetails={details}
      initialWebsite={website}
      platformDomain={getServerConfig().platformDomain}
      initialTab={tab}
    />
  );
}
