import type { ReactNode } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { requirePageRole } from "@/server/middleware/page-auth";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { TenantModel } from "@/db/models/tenant.model";
import { PLATFORM } from "@/lib/constants";

/**
 * Tenant admin console shell (/dashboard). Requires TENANT_ADMIN with an
 * ACTIVE tenant (Phase 3 resolution re-checks per request). Platform
 * admins are deliberately not given package controls here (locked scope).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const auth = await requirePageRole("TENANT_ADMIN");
  const tenant = auth.user.tenantId
    ? await TenantModel.findById(auth.user.tenantId).lean()
    : null;

  const NAV = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/packages", label: "Packages" },
    { href: "/dashboard/packages/new", label: "Create Package" },
    { href: "/dashboard/account", label: "Account" },
  ];

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-signal" strokeWidth={1.5} />
              <span className="text-[14px] font-semibold text-paper">
                {tenant?.companyName ?? "Tenant Console"}
              </span>
              <span className="hidden font-mono text-[9.5px] tracking-[0.25em] text-dim sm:inline">
                VIA {PLATFORM.codename}
              </span>
            </Link>
            <nav className="hidden items-center gap-6 md:flex" aria-label="Tenant console">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-mono text-[11px] tracking-[0.18em] text-fog uppercase transition-colors hover:text-paper"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[10px] tracking-[0.15em] text-dim sm:inline">
              {auth.user.email}
            </span>
            <AdminSignOut />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
