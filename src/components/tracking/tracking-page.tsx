import { SiteFooter } from "@/components/website/site-footer";
import { SiteNav } from "@/components/website/site-nav";
import { TrackingExperience } from "@/components/tracking/tracking-experience";
import { brandingVars } from "@/lib/branding";
import type { PublicWebsiteData } from "@/types/website";

/** Tenant-branded /track surface: server shell + client tracking island. */
export function TrackingPage({
  website,
  initialTrackingId = "",
}: {
  website: PublicWebsiteData;
  initialTrackingId?: string;
}) {
  return (
    <div style={brandingVars(website)} className="flex min-h-screen flex-col antialiased">
      <SiteNav data={website} />

      <main className="flex-1 bg-neutral-50">
        <section className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
          <p
            className="text-[12px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: "var(--brand)" }}
          >
            {website.companyName}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-neutral-900 sm:text-4xl">
            Track your package
          </h1>
          <p className="mt-3 mb-8 max-w-xl text-[15px] leading-7 text-neutral-600">
            Enter your tracking ID to see the current status, the full delivery timeline, and where
            your package is right now.
          </p>

          <TrackingExperience initialTrackingId={initialTrackingId} />
        </section>
      </main>

      <SiteFooter data={website} />
    </div>
  );
}
