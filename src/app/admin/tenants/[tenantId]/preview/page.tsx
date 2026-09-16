import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TenantWebsite } from "@/components/website/tenant-website";
import { OBJECT_ID_PATTERN } from "@/lib/validation-patterns";
import { requirePageRole } from "@/server/middleware/page-auth";
import { getTenantDetails } from "@/server/services/tenant.service";
import { getWebsiteConfig } from "@/server/services/website.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Website preview", robots: { index: false, follow: false } };

/**
 * Platform-Admin website preview — renders the SAME shared tenant
 * renderer against the saved configuration, behind the PLATFORM_ADMIN
 * page guard. It is not a public URL and it creates no second
 * deployment: suspended/archived tenants can still be previewed here
 * while their public host stays dark.
 */
export default async function TenantPreviewPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requirePageRole("PLATFORM_ADMIN");
  const { tenantId } = await params;
  if (!OBJECT_ID_PATTERN.test(tenantId)) notFound();

  const [details, website] = await Promise.all([
    getTenantDetails(tenantId).catch(() => null),
    getWebsiteConfig(tenantId).catch(() => null),
  ]);
  if (!details || !website) notFound();

  return (
    <div>
      <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-3 border-b border-hair bg-surface px-5 py-3">
        <span className="text-[12.5px] font-medium text-accent">
          Preview — {details.tenant.companyName} · status {details.tenant.status}
        </span>
        <Link
          href={`/admin/tenants/${tenantId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-hair-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-slate transition-colors hover:border-muted"
        >
          <ArrowLeft className="h-3 w-3" /> Back to editor
        </Link>
      </div>
      <TenantWebsite data={website} />
    </div>
  );
}
