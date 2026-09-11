import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackageDetails } from "@/components/tenant/package-details";
import { TenantModel } from "@/db/models/tenant.model";
import { OBJECT_ID_PATTERN } from "@/lib/validation-patterns";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Package Details" };

export default async function PackageDetailsPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const auth = await requirePageRole("TENANT_ADMIN");
  const { packageId } = await params;
  if (!OBJECT_ID_PATTERN.test(packageId)) notFound();
  const tenant = auth.user.tenantId
    ? await TenantModel.findById(auth.user.tenantId).lean()
    : null;
  return (
    <PackageDetails
      packageId={packageId}
      companyName={tenant?.companyName ?? "Your company"}
      slug={tenant?.slug ?? ""}
    />
  );
}
