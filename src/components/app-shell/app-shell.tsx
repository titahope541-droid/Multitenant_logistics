"use client";

/**
 * AppShell — the one application chrome for BOTH consoles (tenant admin
 * and platform admin). Dark navy sidebar + light content well.
 *
 * Navigation is passed in as serializable descriptors (icon keys, not
 * components) so server pages can configure it. Items may belong to the
 * primary group or the `secondary` group (rendered near the bottom).
 * Every item has an icon AND a text label, an active state with a subtle
 * indicator, hover and focus states; on small screens it collapses into
 * a mobile drawer.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Settings,
  UserRound,
  type LucideIcon,
  X,
} from "lucide-react";
import { logout } from "@/services/auth";
import { cn } from "@/lib/utils";

export type NavIconKey =
  | "dashboard"
  | "packages"
  | "create"
  | "account"
  | "tenants"
  | "settings";

const ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  packages: Package,
  create: PlusCircle,
  account: UserRound,
  tenants: Building2,
  settings: Settings,
};

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
  /** Match nested routes (e.g. /admin/tenants/123). */
  prefix?: boolean;
  /** Secondary items render above Logout in the sidebar footer. */
  group?: "secondary";
}

export interface ShellUser {
  name: string;
  email: string;
  roleLabel: string;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.prefix) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return pathname === item.href;
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "U";
}

export function AppShell({
  brandName,
  brandSubtitle,
  nav,
  user,
  children,
}: {
  brandName: string;
  brandSubtitle: string;
  nav: NavItem[];
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const primary = nav.filter((item) => item.group !== "secondary");
  const secondary = nav.filter((item) => item.group === "secondary");
  const activeItem = nav.find((item) => isActive(pathname, item));

  // Close transient UI whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const navLinks = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-sidebar-raised text-white"
                  : "text-sidebar-text hover:bg-white/5 hover:text-white",
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-accent"
                />
              ) : null}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-sidebar-accent" : "text-sidebar-text",
                )}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const signOutButton = (
    <button
      type="button"
      onClick={onSignOut}
      disabled={signingOut}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-sidebar-text transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
    >
      <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {signingOut ? "Signing out…" : "Logout"}
    </button>
  );

  const brand = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-[14px] font-semibold text-white">
        {initials(brandName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-white">{brandName}</span>
        <span className="block truncate text-[11.5px] text-sidebar-text">{brandSubtitle}</span>
      </span>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Sidebar (desktop) ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          {brand}
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Main">
          {navLinks(primary)}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border p-3">
          {navLinks(secondary)}
          <div className="pt-1">{signOutButton}</div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-hair bg-surface px-4 lg:hidden">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[13px] font-semibold text-white">
            {initials(brandName)}
          </span>
          <span className="truncate text-[14px] font-semibold text-slate">{brandName}</span>
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          className="rounded-lg p-2 text-body transition-colors hover:bg-surface-2 hover:text-slate"
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="sticky top-16 z-30 border-b border-sidebar-border bg-sidebar p-3 lg:hidden"
        >
          {navLinks(primary)}
          <div className="mt-2 space-y-1 border-t border-sidebar-border pt-2">
            {navLinks(secondary)}
            <div className="pt-1">{signOutButton}</div>
          </div>
        </nav>
      ) : null}

      {/* ── Content column ── */}
      <div className="lg:pl-60">
        {/* Desktop header: section context left, account right */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-hair bg-surface/90 px-8 backdrop-blur lg:flex">
          <p className="text-[13.5px] font-medium text-body">
            {activeItem?.label ?? brandSubtitle}
          </p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-slate ring-1 ring-hair">
                {initials(user.name)}
              </span>
              <span className="text-left">
                <span className="block text-[13px] font-medium text-slate">{user.name}</span>
                <span className="block text-[11.5px] text-muted">{user.roleLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-hair bg-surface p-1.5 shadow-[var(--shadow-raised)]"
              >
                <p className="truncate px-3 py-2 text-[12px] text-muted">{user.email}</p>
                <div className="border-t border-hair pt-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-body transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    {signingOut ? "Signing out…" : "Logout"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
