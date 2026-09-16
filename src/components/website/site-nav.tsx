"use client";

/**
 * Tenant website navigation — configuration-driven links plus the natural
 * Home/Track anchors. Tenant-branded; no platform branding anywhere.
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
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
          {data.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.branding.logoUrl} alt={`${data.companyName} logo`} className="h-8 w-auto" />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-semibold text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {data.companyName.charAt(0)}
            </span>
          )}
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
            {data.companyName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.label + link.href}
              href={link.href}
              className="text-[14px] font-medium text-neutral-600 transition-colors hover:text-neutral-900"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/track"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--brand)", borderRadius: "var(--brand-radius)" }}
          >
            <PackageSearch className="h-4 w-4" aria-hidden="true" />
            Track package
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-black/8 bg-white px-5 py-4 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.label + link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/track"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold text-white"
                style={{ backgroundColor: "var(--brand)" }}
              >
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                Track package
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
