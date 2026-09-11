import type { ReactNode } from "react";
import Link from "next/link";
import { requirePageRole } from "@/server/middleware/page-auth";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { PLATFORM } from "@/lib/constants";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/settings", label: "Settings" },
] as const;

/**
 * Platform admin console shell. Guards: unauthenticated or non-platform
 * visitors are redirected before any data loads (UX layer — the API
 * remains the real security boundary).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requirePageRole("PLATFORM_ADMIN");

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold tracking-[0.22em] text-paper">
                {PLATFORM.codename}
              </span>
              <span className="font-mono text-[10px] tracking-[0.3em] text-signal">
                CONTROL PLANE
              </span>
            </Link>
            <nav className="hidden items-center gap-6 md:flex" aria-label="Console">
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
