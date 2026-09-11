import { brandingVars } from "@/lib/branding";
import { SiteNav } from "@/components/website/site-nav";
import { SiteHero } from "@/components/website/site-hero";
import { SiteServices, SiteFeatures } from "@/components/website/site-services";
import { SiteAbout } from "@/components/website/site-about";
import { SiteTrackingCta } from "@/components/website/site-tracking-cta";
import { SiteContact } from "@/components/website/site-contact";
import { SiteFooter } from "@/components/website/site-footer";
import type { WebsiteSectionKey } from "@/lib/website-defaults";
import type { PublicWebsiteData } from "@/types/website";
import type { JSX } from "react";

/**
 * Tenant website — the ONE shared renderer for every tenant.
 * Sections render in the configured order, and only when enabled;
 * branding arrives as CSS variables. No tenant-specific code exists.
 */
export function TenantWebsite({ data }: { data: PublicWebsiteData }) {
  const SECTIONS: Record<WebsiteSectionKey, JSX.Element> = {
    hero: <SiteHero data={data} />,
    services: <SiteServices data={data} />,
    about: <SiteAbout data={data} />,
    features: <SiteFeatures data={data} />,
    tracking: <SiteTrackingCta data={data} />,
    contact: <SiteContact data={data} />,
  };

  return (
    <div
      style={brandingVars(data)}
      className="min-h-screen antialiased"
      data-theme={data.branding.theme}
    >
      <SiteNav data={data} />
      <main>
        {data.sectionOrder.map((key) => (
          <div key={key}>{SECTIONS[key]}</div>
        ))}
      </main>
      <SiteFooter data={data} />
    </div>
  );
}
