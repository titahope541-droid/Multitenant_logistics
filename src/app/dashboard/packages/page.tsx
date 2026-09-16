import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PackagesManager } from "@/components/tenant/packages-manager";
import { PageHeader, buttonClasses } from "@/components/ui";
import { TenantModel } from "@/db/models/tenant.model";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Packages" };

export default async function TenantPackagesPage() {
  const auth = await requirePageRole("TENANT_ADMIN");
  const tenant = auth.user.tenantId
    ? await TenantModel.findById(auth.user.tenantId).lean()
    : null;

  return (
    <>
      <PageHeader
        title="Packages"
        description="Every shipment belonging to your company. Archived packages stay hidden until you open the archive."
        actions={
          <Link href="/dashboard/packages/new" className={buttonClasses("primary")}>
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Create package
          </Link>
        }
      />
      <PackagesManager slug={tenant?.slug ?? ""} />
    </>
  );
}
