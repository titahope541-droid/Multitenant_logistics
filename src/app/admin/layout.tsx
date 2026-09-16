import type { ReactNode } from "react";
import { AppShell, type NavItem } from "@/components/app-shell/app-shell";
import { PLATFORM } from "@/lib/constants";
import { requirePageRole } from "@/server/middleware/page-auth";

export const dynamic = "force-dynamic";

/**
 * Platform admin console shell. PLATFORM_ADMIN only — the page guard sends
 * anyone else to their own console, and every endpoint behind this area
 * re-checks the role server-side.
 *
 * Navigation covers only what the platform admin owns: tenants, the
 * platform, and their own account. Package operations never appear here.
 */
const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/tenants", label: "Tenants", icon: "tenants", prefix: true },
  { href: "/admin/settings", label: "Settings", icon: "settings", group: "secondary" },
  { href: "/admin/account", label: "Account", icon: "account", group: "secondary" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requirePageRole("PLATFORM_ADMIN");

  return (
    <AppShell
      brandName={PLATFORM.name}
      brandSubtitle="Platform administration"
      nav={NAV}
      user={{ name: auth.user.name, email: auth.user.email, roleLabel: "Platform admin" }}
    >
      {children}
    </AppShell>
  );
}
