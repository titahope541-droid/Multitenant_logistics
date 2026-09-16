import type { Metadata } from "next";
import { TenantsManager } from "@/components/admin/tenants-manager";
import { PageHeader } from "@/components/ui";
import { getServerConfig } from "@/server/config/env";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tenants" };

export default async function AdminTenantsPage() {
  await requirePageRole("PLATFORM_ADMIN");
  return (
    <>
      <PageHeader
        title="Tenants"
        description="Every logistics company on this platform. Provisioning creates the company, one tenant admin, and its website configuration together."
      />
      <TenantsManager platformDomain={getServerConfig().platformDomain} />
    </>
  );
}
