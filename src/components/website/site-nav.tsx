"use client";

/**
 * Tenant website navigation — fully configuration-driven (config nav items
 * plus the natural Home/Track anchors). Tenant-branded, mobile drawer,
 * keyboard-friendly. No platform branding anywhere on a tenant site.
 */

import { useState } from "react";
import Link from "next/link";
import { Menu, PackageSearch, X } from "lucide-react";
import type { PublicWebsiteData } from "@/types/website";

export function SiteNav({ data }: { data: PublicWebsiteData }) {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Home", href: "/" },
    ...data.navigation
      .filter(
        (item) =>
          item.visible &&
          item.label.toLowerCase() !== "home" &&
          item.href !== "/" &&
          item.href !== "/track",
      )
      .map((item) => ({ label: item.label, href: item.href })),
    { label: "Track", href: "/track" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          {data.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.branding.logoUrl} alt={`${data.companyName} logo`} className="h-8 w-auto" />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {data.companyName.charAt(0)}
            </span>
          )}
          <span className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
            {data.companyName}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Tenant site">
          {links.map((link) => (
            <Link
              key={link.label + link.href}
              href={link.href}
              className="text-[13px] font-medium tracking-wide text-neutral-500 transition-colors hover:text-neutral-900"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/track"
            className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--brand)", borderRadius: "var(--brand-radius)" }}
          >
            <PackageSearch className="h-3.5 w-3.5" />
            Track package
          </Link>
        </nav>

        <button
          className="p-2 text-neutral-700 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-black/10 bg-white px-5 py-4 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.label + link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-2 py-2.5 text-[15px] font-medium text-neutral-800"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
