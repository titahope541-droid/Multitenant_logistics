/**
 * Website render + editing models.
 *
 * `PublicWebsiteData` is the ONLY website shape sent to public pages —
 * built server-side from tenant identity + WebsiteConfig; contains no
 * tenantId and no database ids. `WebsiteConfigDraft` is the Platform-Admin
 * editing shape (same fields, all optional) — Tenant Admins never receive
 * or submit either (docs/website-configuration.md).
 */

import type {
  ButtonStyle,
  ThemePreference,
  WebsiteIcon,
  WebsiteSectionKey,
} from "@/lib/website-defaults";

export interface WebsiteNavigationItem {
  label: string;
  href: string;
  visible: boolean;
}

export interface WebsiteCardItem {
  title: string;
  /** Small category chip above the title (e.g. "Local"). */
  label?: string;
  description?: string;
  icon?: WebsiteIcon;
  /** URL-based imagery only — there is no upload system. */
  imageUrl?: string;
  visible: boolean;
}

export interface WebsiteStepItem {
  title: string;
  description?: string;
}

export interface WebsiteFaqItem {
  question: string;
  answer: string;
  visible: boolean;
}

export interface WebsiteSocialLink {
  platform: string;
  url: string;
}

export interface WebsiteBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  buttonStyle: ButtonStyle;
  borderRadius: number;
  theme: ThemePreference;
  tagline?: string;
}

export interface WebsiteSections {
  hero: {
    enabled: boolean;
    headline: string;
    subtext: string;
    ctaLabel: string;
    ctaHref: string;
    imageUrl?: string;
  };
  services: { enabled: boolean; title: string; items: WebsiteCardItem[] };
  about: { enabled: boolean; title: string; text?: string; imageUrl?: string };
  features: { enabled: boolean; title: string; items: WebsiteCardItem[] };
  howItWorks: { enabled: boolean; title: string; steps: WebsiteStepItem[] };
  tracking: { enabled: boolean; heading: string; subtext: string; ctaLabel: string };
  faq: { enabled: boolean; title: string; items: WebsiteFaqItem[] };
  contact: { enabled: boolean; hours?: string };
  footer: { enabled: boolean; text?: string; showNavigation: boolean; showSocial: boolean };
}

export interface WebsiteSeo {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
}

export interface PublicWebsiteData {
  companyName: string;
  slug: string;
  branding: WebsiteBranding;
  navigation: WebsiteNavigationItem[];
  sections: WebsiteSections;
  /** Render order of the orderable sections (footer is always last). */
  sectionOrder: WebsiteSectionKey[];
  contact: { phone?: string; email?: string; address?: string };
  socialLinks: WebsiteSocialLink[];
  seo: WebsiteSeo;
  /** True when no config row existed and identity fallbacks carried the render. */
  usingDefaults: boolean;
}

/* ── Platform-Admin editing payload (deep-partial by hand for clarity) ───── */

export interface WebsiteConfigDraft {
  branding?: Partial<WebsiteBranding>;
  navigation?: WebsiteNavigationItem[];
  sections?: {
    hero?: Partial<PublicWebsiteData["sections"]["hero"]>;
    services?: { enabled?: boolean; title?: string; items?: WebsiteCardItem[] };
    about?: Partial<PublicWebsiteData["sections"]["about"]>;
    features?: { enabled?: boolean; title?: string; items?: WebsiteCardItem[] };
    howItWorks?: { enabled?: boolean; title?: string; steps?: WebsiteStepItem[] };
    tracking?: Partial<PublicWebsiteData["sections"]["tracking"]>;
    faq?: { enabled?: boolean; title?: string; items?: WebsiteFaqItem[] };
    contact?: Partial<PublicWebsiteData["sections"]["contact"]>;
    footer?: Partial<PublicWebsiteData["sections"]["footer"]>;
  };
  sectionOrder?: WebsiteSectionKey[];
  contact?: { phone?: string; email?: string; address?: string };
  socialLinks?: WebsiteSocialLink[];
  seo?: WebsiteSeo;
}
