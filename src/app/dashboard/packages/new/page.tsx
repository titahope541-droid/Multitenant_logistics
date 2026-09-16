import type { Metadata } from "next";
import { PackageCreateForm } from "@/components/tenant/package-create-form";
import { PageHeader } from "@/components/ui";
import { TenantModel } from "@/db/models/tenant.model";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create Package" };

export default async function NewPackagePage() {
  const auth = await requirePageRole("TENANT_ADMIN");
  const tenant = auth.user.tenantId
    ? await TenantModel.findById(auth.user.tenantId).lean()
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Create package"
        description="Register a shipment. The tracking ID and its first status event are created together."
      />
      <PackageCreateForm
        companyName={tenant?.companyName ?? "Your company"}
        slug={tenant?.slug ?? ""}
      />
    </div>
  );
}
