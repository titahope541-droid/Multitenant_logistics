import { brandingVars } from "@/lib/branding";
import { SiteNav } from "@/components/website/site-nav";
import { SiteFooter } from "@/components/website/site-footer";
import { TrackingExperience } from "@/components/tracking/tracking-experience";
import type { PublicWebsiteData } from "@/types/website";

/** Tenant-branded /track surface (server shell + client experience island). */
export function TrackingPage({
  website,
  initialTrackingId = "",
}: {
  website: PublicWebsiteData;
  initialTrackingId?: string;
}) {
  return (
    <div
      style={{ ...brandingVars(website), ...(website.branding.fontFamily ? { fontFamily: website.branding.fontFamily } : {}) }}
      className="flex min-h-screen flex-col bg-neutral-50 font-sans text-neutral-900 antialiased"
    >
      <SiteNav data={website} />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-18">
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: "var(--brand)" }}>
            {website.companyName} · Live tracking
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-neutral-900 sm:text-4xl">
            Track your package.
          </h1>
          <p className="mt-3 mb-8 text-[15px] leading-7 text-neutral-600">
            Latest status, the status timeline, and current location —
            straight from our operations team.
          </p>
          <TrackingExperience initialTrackingId={initialTrackingId} />
        </section>
      </main>
      <SiteFooter data={website} />
    </div>
  );
}
