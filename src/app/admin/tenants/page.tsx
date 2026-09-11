import type { Metadata } from "next";
import { TenantsManager } from "@/components/admin/tenants-manager";

export const metadata: Metadata = { title: "Tenants" };

export default function AdminTenantsPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
          Control plane — tenants
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-paper">
          Every company on the platform.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-fog">
          Provisioning is atomic: each new tenant arrives with exactly one
          tenant admin and an initialized website configuration. Suspension
          and archiving disable access without deleting anything.
        </p>
      </div>
      <TenantsManager />
    </div>
  );
}
