import type { ReactNode } from "react";
import { AppShell, type NavItem } from "@/components/app-shell/app-shell";
import { TenantModel } from "@/db/models/tenant.model";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";

/**
 * Tenant admin console shell. Requires TENANT_ADMIN with an ACTIVE tenant
 * (session resolution re-checks both on every request).
 *
 * Navigation shows ONLY what a tenant admin owns: packages and their own
 * account. Website content, branding, SEO, tenant management and platform
 * settings are Platform-Admin capabilities and never appear here.
 */
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/packages", label: "Packages", icon: "packages", prefix: true },
  { href: "/dashboard/packages/new", label: "Create Package", icon: "create" },
  { href: "/dashboard/account", label: "Account", icon: "account" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const auth = await requirePageRole("TENANT_ADMIN");
  const tenant = auth.user.tenantId
    ? await TenantModel.findById(auth.user.tenantId).lean()
    : null;

  return (
    <AppShell
      brandName={tenant?.companyName ?? "Your company"}
      brandSubtitle="Logistics operations"
      nav={NAV}
      user={{ name: auth.user.name, email: auth.user.email, roleLabel: "Tenant admin" }}
    >
      {children}
    </AppShell>
  );
}
