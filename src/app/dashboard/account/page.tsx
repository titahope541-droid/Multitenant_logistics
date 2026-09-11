import type { Metadata } from "next";
import { AccountForm } from "@/components/tenant/account-form";
import { requirePageRole } from "@/server/middleware/page-auth";

export const metadata: Metadata = { title: "Account" };

export default async function TenantAccountPage() {
  const auth = await requirePageRole("TENANT_ADMIN");
  return (
    <div className="max-w-xl">
      <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
        Account — security
      </p>
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-paper">{auth.user.name}</h1>
      <p className="mt-2 mb-8 font-mono text-[12px] text-dim">
        {auth.user.email} · {auth.user.role}
      </p>
      <AccountForm />
    </div>
  );
}
