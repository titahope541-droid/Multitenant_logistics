import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { DevPortal } from "@/components/site/dev-portal";
import { TenantWebsite } from "@/components/website/tenant-website";
import { SiteUnavailable } from "@/components/website/site-unavailable";
import { getServerConfig } from "@/server/config/env";
import { resolveRequestSite } from "@/server/services/tenant-resolution.service";
import { getPublicWebsiteData } from "@/server/services/website.service";
import { getLogger } from "@/server/utils/logger";

export const dynamic = "force-dynamic";

const log = getLogger("site");

/**
 * Host-aware front door:
 *   platform root     → developer portal
 *   admin subdomain   → platform console
 *   tenant subdomain  → configuration-driven tenant website
 *   unknown host/slug → safe "Website Not Found"
 *   suspended/archived tenant → generic unavailable page (zero content)
 */
export async function generateMetadata(): Promise<Metadata> {
  const resolution = await resolveRequestSite();
  if (resolution.kind !== "tenant") return {}; // portal defaults from layout
  const { platformDomain } = getServerConfig();
  const { companyName, slug } = resolution.tenant;

  // SEO is configuration-driven (Platform Admin owns it); identity
  // fallbacks keep every tenant indexable-by-default without setup.
  let seo: Awaited<ReturnType<typeof getPublicWebsiteData>>["seo"] = {};
  let faviconUrl: string | undefined;
  try {
    const data = await getPublicWebsiteData(resolution.tenant);
    seo = data.seo;
    faviconUrl = data.branding.faviconUrl;
  } catch {
    /* metadata must never break the page render */
  }

  const title = seo.title ?? companyName;
  const description =
    seo.description ??
    `${companyName} — reliable logistics, and live package tracking with your tracking ID.`;
  return {
    title,
    description,
    alternates: { canonical: `https://${slug}.${platformDomain}` },
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
    openGraph: {
      title: seo.ogTitle ?? title,
      description: seo.ogDescription ?? description,
      siteName: companyName,
      type: "website",
      ...(seo.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
  };
}

export default async function HomePage() {
  const resolution = await resolveRequestSite();

  if (resolution.kind === "platform-admin") redirect("/admin");
  if (resolution.kind === "unknown") return <SiteUnavailable reason="not-found" />;
  if (resolution.kind === "platform") {
    return (
      <div className="relative min-h-screen overflow-x-clip bg-ink text-paper">
        <Nav />
        <DevPortal />
        <Footer />
      </div>
    );
  }

  if (resolution.tenant.status !== "ACTIVE") {
    return <SiteUnavailable reason="unavailable" />;
  }

  let data: Awaited<ReturnType<typeof getPublicWebsiteData>> | null = null;
  try {
    data = await getPublicWebsiteData(resolution.tenant);
  } catch (error) {
    log.error({ err: error, tenant: resolution.tenant.slug }, "failed to build website data");
  }
  if (!data) return <SiteUnavailable reason="error" />;
  return <TenantWebsite data={data} />;
}
