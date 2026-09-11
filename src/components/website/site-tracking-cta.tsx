import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";
import type { PublicWebsiteData } from "@/types/website";

/** Tracking CTA — heading/subtext/label configurable; always → /track. */
export function SiteTrackingCta({ data }: { data: PublicWebsiteData }) {
  const { tracking } = data.sections;
  if (!tracking.enabled) return null;

  return (
    <section id="track" className="border-b border-black/10" style={{ backgroundColor: "var(--brand-soft)" }}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: "var(--brand)" }}>
            Live tracking
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{tracking.heading}</h2>
          <p className="mt-4 text-[15px] leading-7 opacity-75">{tracking.subtext}</p>
          <Link
            href="/track"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold tracking-wide text-white transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--brand)", borderRadius: "var(--brand-radius)" }}
          >
            <PackageSearch className="h-4 w-4" />
            {tracking.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
