import type { Metadata } from "next";
import { PackagesManager } from "@/components/tenant/packages-manager";
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
    <div>
      <div className="mb-8">
        <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
          Operations — packages
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-paper">
          Your tenant&apos;s shipments.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-fog">
          Scoped to your tenant only — the server makes every other tenant
          invisible. Archived packages live in the archive drawer until
          restored.
        </p>
      </div>
      <PackagesManager slug={tenant?.slug ?? ""} />
    </div>
  );
}
