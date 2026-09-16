import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { SiteImage } from "@/components/website/site-image";
import { TrackingVisual } from "@/components/website/tracking-visual";
import type { PublicWebsiteData } from "@/types/website";

/**
 * Hero — dark tenant-aware band: configured headline/subtext/CTA, optional
 * URL-based image in a rounded container, and an illustrative tracking card.
 * Falls back to identity copy when the tenant has not configured content.
 */
export function SiteHero({ data }: { data: PublicWebsiteData }) {
  const hero = data.sections.hero;
  const hasContact = Boolean(
    data.contact.phone || data.contact.email || data.contact.address,
  );

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "var(--brand-ink)" }}>
      {/* subtle decorative dot field */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Copy + CTAs */}
          <div>
            {data.branding.tagline ? (
              <p
                className="mb-5 inline-flex rounded-full px-3 py-1 text-[12px] font-semibold tracking-[0.12em] uppercase"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#ffffff" }}
              >
                {data.branding.tagline}
              </p>
            ) : null}

            <h1 className="max-w-xl text-4xl leading-[1.06] font-semibold tracking-[-0.03em] text-white sm:text-5xl lg:text-[54px]">
              {hero.headline}
            </h1>

            <p className="mt-5 max-w-lg text-[16px] leading-8 text-white/75">{hero.subtext}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={hero.ctaHref}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--brand)", borderRadius: "var(--brand-radius)" }}
              >
                <PackageSearch className="h-4 w-4" aria-hidden="true" />
                {hero.ctaLabel}
              </Link>
              {hasContact && data.sections.contact.enabled ? (
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 border border-white/25 px-6 py-3.5 text-[14px] font-semibold text-white/90 transition-colors hover:border-white/50 hover:text-white"
                  style={{ borderRadius: "var(--brand-radius)" }}
                >
                  Contact us
                </a>
              ) : null}
            </div>
          </div>

          {/* Image + illustrative tracking card */}
          {hero.imageUrl ? (
            <div className="relative">
              <SiteImage
                src={hero.imageUrl}
                alt={`${data.companyName} logistics operations`}
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl"
              />
              {/* <div className="mt-5 lg:absolute lg:-bottom-8 lg:left-0 lg:mt-0 lg:w-[74%]">
                <TrackingVisual />
              </div> */}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-7">
              <TrackingVisual />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
