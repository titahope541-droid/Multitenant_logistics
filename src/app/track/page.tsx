import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { SiteUnavailable } from "@/components/website/site-unavailable";
import { TrackingPage } from "@/components/tracking/tracking-page";
import { resolveRequestSite } from "@/server/services/tenant-resolution.service";
import { getPublicWebsiteData } from "@/server/services/website.service";
import { getLogger } from "@/server/utils/logger";

export const dynamic = "force-dynamic";

const log = getLogger("track");

/** Track pages carry user-entered tracking IDs — never indexed. */
export async function generateMetadata(): Promise<Metadata> {
  const resolution = await resolveRequestSite();
  const title =
    resolution.kind === "tenant" ? `Track your package — ${resolution.tenant.companyName}` : "Track";
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function TrackPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ trackingId?: string }>;
}) {
  const query = await searchParams;
  const initialTrackingId = (query.trackingId ?? "").trim();

  const resolution = await resolveRequestSite();

  if (resolution.kind === "unknown") return <SiteUnavailable reason="not-found" />;
  if (resolution.kind !== "tenant") {
    // Platform host: point developers at the local-subdomain pattern.
    return (
      <div className="relative min-h-screen bg-ink text-paper">
        <Nav />
        <main className="mx-auto max-w-xl px-5 pt-32 pb-20 text-center">
          <p className="font-mono text-[10px] tracking-[0.25em] text-signal uppercase">Public tracking</p>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-paper">
            Tracking lives on tenant sites.
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-fog">
            Open a tenant hostname and append <code className="font-mono text-paper/90">/track</code>.
            Locally that looks like{" "}
            <code className="font-mono text-paper/90">swift.localhost:3000/track</code> —
            see docs/development.md.
          </p>
        </main>
      </div>
    );
  }

  if (resolution.tenant.status !== "ACTIVE") {
    return <SiteUnavailable reason="unavailable" />;
  }

  let website: Awaited<ReturnType<typeof getPublicWebsiteData>> | null = null;
  try {
    website = await getPublicWebsiteData(resolution.tenant);
  } catch (error) {
    log.error({ err: error, tenant: resolution.tenant.slug }, "failed to load tracking page data");
  }
  if (!website) return <SiteUnavailable reason="error" />;
  return <TrackingPage website={website} initialTrackingId={initialTrackingId} />;
}
