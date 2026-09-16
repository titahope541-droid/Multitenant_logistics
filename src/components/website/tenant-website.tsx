import { brandingVars } from "@/lib/branding";
import { SiteAbout } from "@/components/website/site-about";
import { SiteFaq } from "@/components/website/site-faq";
import { SiteFeatures, SiteServices } from "@/components/website/site-services";
import { SiteHero } from "@/components/website/site-hero";
import { SiteHowItWorks } from "@/components/website/site-how-it-works";
import { SiteContact } from "@/components/website/site-contact";
import { SiteFooter } from "@/components/website/site-footer";
import { SiteNav } from "@/components/website/site-nav";
import { SiteTrackingCta } from "@/components/website/site-tracking-cta";
import type { WebsiteSectionKey } from "@/lib/website-defaults";
import type { PublicWebsiteData } from "@/types/website";
import type { JSX } from "react";

/**
 * Tenant website — the ONE shared renderer for every tenant.
 * Sections render in the configured order and only when enabled; branding
 * arrives as CSS variables. No tenant-specific code exists anywhere.
 */
export function TenantWebsite({ data }: { data: PublicWebsiteData }) {
  const SECTIONS: Record<WebsiteSectionKey, JSX.Element> = {
    hero: <SiteHero data={data} />,
    services: <SiteServices data={data} />,
    about: <SiteAbout data={data} />,
    features: <SiteFeatures data={data} />,
    howItWorks: <SiteHowItWorks data={data} />,
    tracking: <SiteTrackingCta data={data} />,
    faq: <SiteFaq data={data} />,
    contact: <SiteContact data={data} />,
  };

  return (
    <div style={brandingVars(data)} className="min-h-screen antialiased" data-theme={data.branding.theme}>
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
