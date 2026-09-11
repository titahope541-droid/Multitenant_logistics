import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";
import { SiteImage } from "@/components/website/site-image";
import type { PublicWebsiteData } from "@/types/website";

/** Hero — headline/subtext/CTA/image all configuration-driven. */
export function SiteHero({ data }: { data: PublicWebsiteData }) {
  const hero = data.sections.hero;
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "var(--brand-ink)" }}>
      {hero.imageUrl ? (
        <SiteImage
          src={hero.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          decorative
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
      )}
      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        {data.branding.tagline ? (
          <p className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-white/60 uppercase">
            {data.branding.tagline}
          </p>
        ) : null}
        <h1 className="max-w-3xl text-4xl leading-[1.02] font-bold tracking-[-0.025em] text-white sm:text-5xl lg:text-6xl">
          {hero.headline}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">{hero.subtext}</p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href={hero.ctaHref}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-[13px] font-semibold tracking-wide text-white transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--brand)", borderRadius: "var(--brand-radius)" }}
          >
            <PackageSearch className="h-4 w-4" />
            {hero.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {data.sections.services.enabled && data.sections.services.items.length > 0 ? (
            <a
              href="#services"
              className="inline-flex items-center gap-2 border border-white/25 px-6 py-3.5 text-[13px] font-semibold tracking-wide text-white/90 transition-colors hover:border-white/50 hover:text-white"
              style={{ borderRadius: "var(--brand-radius)" }}
            >
              {data.sections.services.title}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
