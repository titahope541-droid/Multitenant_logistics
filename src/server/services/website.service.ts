/**
 * Website service — builds the PUBLIC render model and serves the
 * PLATFORM-ADMIN editing surface (Phase 6 + Phase 8).
 *
 * Two audiences, one document:
 *   getPublicWebsiteData(tenant)  → render model, public-safe, never fails
 *                                   on missing/partial config (safe defaults)
 *   getWebsiteConfig / updateWebsiteConfig → Platform Admin only, called
 *                                   behind the PLATFORM_ADMIN role gate
 *
 * Tenant Admins have NO path into either (docs/website-configuration.md).
 */

import mongoose from "mongoose";
import { TenantModel } from "@/db/models/tenant.model";
import {
  WebsiteConfigModel,
  type WebsiteConfigDocument,
} from "@/db/models/website-config.model";
import { apiErrors } from "@/server/http/errors";
import { getLogger } from "@/server/utils/logger";
import {
  DEFAULT_BRANDING,
  DEFAULT_FAQ,
  DEFAULT_HERO_CTA_HREF,
  DEFAULT_HERO_CTA_LABEL,
  DEFAULT_HOW_IT_WORKS,
  DEFAULT_NAVIGATION,
  DEFAULT_SECTION_ORDER,
  DEFAULT_TRACKING_SECTION,
  WEBSITE_SECTION_KEYS,
  type WebsiteSectionKey,
} from "@/lib/website-defaults";
import type { PublicWebsiteData, WebsiteCardItem, WebsiteConfigDraft } from "@/types/website";
import type { ResolvedTenant } from "@/server/services/tenant-resolution.service";

const log = getLogger("website");

/* ── Projection: document (possibly absent/partial) → render model ───────── */

function mapCards(
  items:
    | Array<{
        title: string;
        label?: string;
        description?: string;
        icon?: string;
        imageUrl?: string;
        visible?: boolean;
      }>
    | undefined,
): WebsiteCardItem[] {
  return (items ?? []).map((item) => ({
    title: item.title,
    ...(item.label ? { label: item.label } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(item.icon ? { icon: item.icon as WebsiteCardItem["icon"] } : {}),
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    visible: item.visible !== false,
  }));
}

/**
 * Normalize a stored section order:
 *   · unknown keys dropped, duplicates collapsed
 *   · sections missing from an older configuration (e.g. FAQ, added later)
 *     are inserted at their DEFAULT position rather than dumped at the end,
 *     so a legacy tenant upgrades to a coherent layout automatically.
 */
function normalizeOrder(order: string[] | undefined): WebsiteSectionKey[] {
  const known = (order ?? []).filter((key): key is WebsiteSectionKey =>
    (WEBSITE_SECTION_KEYS as readonly string[]).includes(key),
  );
  const result: WebsiteSectionKey[] = [...new Set(known)];

  for (const key of DEFAULT_SECTION_ORDER) {
    if (result.includes(key)) continue;
    let insertAt = result.length;
    for (let index = DEFAULT_SECTION_ORDER.indexOf(key) - 1; index >= 0; index -= 1) {
      const previous = DEFAULT_SECTION_ORDER[index]!;
      const foundAt = result.indexOf(previous);
      if (foundAt !== -1) {
        insertAt = foundAt + 1;
        break;
      }
    }
    result.splice(insertAt, 0, key);
  }
  return result;
}

export function buildPublicWebsiteData(
  tenant: Pick<ResolvedTenant, "companyName" | "slug" | "contact">,
  config: WebsiteConfigDocument | null,
): PublicWebsiteData {
  const branding = config?.branding ?? {};
  const sections = config?.sections;

  const heroHeadline =
    sections?.hero?.headline?.trim() || `${tenant.companyName} — logistics that arrive.`;
  const heroSubtext =
    sections?.hero?.subtext?.trim() ||
    "Reliable delivery across every route we run. Track your shipment any time with your tracking ID — no account needed.";

  const navigation = (config?.navigation ?? DEFAULT_NAVIGATION).map((item) => ({
    label: item.label,
    href: item.href,
    visible: item.visible !== false,
  }));

  return {
    companyName: tenant.companyName,
    slug: tenant.slug,
    branding: {
      ...(branding.logoUrl ? { logoUrl: branding.logoUrl } : {}),
      ...(branding.faviconUrl ? { faviconUrl: branding.faviconUrl } : {}),
      primaryColor: branding.primaryColor ?? DEFAULT_BRANDING.primaryColor,
      secondaryColor: branding.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
      accentColor: branding.accentColor ?? DEFAULT_BRANDING.accentColor,
      backgroundColor: branding.backgroundColor ?? DEFAULT_BRANDING.backgroundColor,
      textColor: branding.textColor ?? DEFAULT_BRANDING.textColor,
      fontFamily: branding.fontFamily ?? DEFAULT_BRANDING.fontFamily,
      buttonStyle: branding.buttonStyle ?? DEFAULT_BRANDING.buttonStyle,
      borderRadius: branding.borderRadius ?? DEFAULT_BRANDING.borderRadius,
      theme: branding.theme ?? DEFAULT_BRANDING.theme,
      ...(branding.tagline ? { tagline: branding.tagline } : {}),
    },
    navigation,
    sections: {
      hero: {
        enabled: sections?.hero?.enabled ?? true,
        headline: heroHeadline,
        subtext: heroSubtext,
        ctaLabel: sections?.hero?.ctaLabel?.trim() || DEFAULT_HERO_CTA_LABEL,
        ctaHref: sections?.hero?.ctaHref?.trim() || DEFAULT_HERO_CTA_HREF,
        ...(sections?.hero?.imageUrl ? { imageUrl: sections.hero.imageUrl } : {}),
      },
      services: {
        enabled: sections?.services?.enabled ?? false,
        title: sections?.services?.title?.trim() || "Services",
        items: mapCards(sections?.services?.items),
      },
      about: {
        enabled: sections?.about?.enabled ?? false,
        title: sections?.about?.title?.trim() || "About us",
        ...(sections?.about?.text ? { text: sections.about.text } : {}),
        ...(sections?.about?.imageUrl ? { imageUrl: sections.about.imageUrl } : {}),
      },
      features: {
        enabled: sections?.features?.enabled ?? false,
        title: sections?.features?.title?.trim() || "Why choose us",
        items: mapCards(sections?.features?.items),
      },
      tracking: {
        enabled: sections?.tracking?.enabled ?? true,
        heading: sections?.tracking?.heading?.trim() || DEFAULT_TRACKING_SECTION.heading,
        subtext: sections?.tracking?.subtext?.trim() || DEFAULT_TRACKING_SECTION.subtext,
        ctaLabel: sections?.tracking?.ctaLabel?.trim() || DEFAULT_TRACKING_SECTION.ctaLabel,
      },
      howItWorks: {
        enabled: sections?.howItWorks?.enabled ?? true,
        title: sections?.howItWorks?.title?.trim() || DEFAULT_HOW_IT_WORKS.title,
        steps: (sections?.howItWorks?.steps?.length
          ? sections.howItWorks.steps
          : DEFAULT_HOW_IT_WORKS.steps
        ).map((step) => ({
          title: step.title,
          ...(step.description ? { description: step.description } : {}),
        })),
      },
      faq: {
        enabled: sections?.faq?.enabled ?? true,
        title: sections?.faq?.title?.trim() || DEFAULT_FAQ.title,
        items: (sections?.faq?.items?.length ? sections.faq.items : DEFAULT_FAQ.items).map(
          (item) => ({
            question: item.question,
            answer: item.answer,
            visible: item.visible !== false,
          }),
        ),
      },
      contact: {
        enabled: sections?.contact?.enabled ?? true,
        ...(sections?.contact?.hours ? { hours: sections.contact.hours } : {}),
      },
      footer: {
        enabled: sections?.footer?.enabled ?? true,
        ...(sections?.footer?.text ? { text: sections.footer.text } : {}),
        showNavigation: sections?.footer?.showNavigation !== false,
        showSocial: sections?.footer?.showSocial !== false,
      },
    },
    sectionOrder: normalizeOrder(config?.sectionOrder),
    contact: {
      ...(config?.contact?.phone ?? tenant.contact.phone
        ? { phone: config?.contact?.phone ?? tenant.contact.phone }
        : {}),
      ...(config?.contact?.email ?? tenant.contact.email
        ? { email: config?.contact?.email ?? tenant.contact.email }
        : {}),
      ...(config?.contact?.address ?? tenant.contact.address
        ? { address: config?.contact?.address ?? tenant.contact.address }
        : {}),
    },
    socialLinks: (config?.socialLinks ?? []).map((link) => ({
      platform: link.platform,
      url: link.url,
    })),
    seo: {
      ...(config?.seo?.title ? { title: config.seo.title } : {}),
      ...(config?.seo?.description ? { description: config.seo.description } : {}),
      ...(config?.seo?.ogTitle ? { ogTitle: config.seo.ogTitle } : {}),
      ...(config?.seo?.ogDescription ? { ogDescription: config.seo.ogDescription } : {}),
      ...(config?.seo?.ogImageUrl ? { ogImageUrl: config.seo.ogImageUrl } : {}),
    },
    usingDefaults: !config,
  };
}

/** Public render data (never throws on a missing config — safe defaults). */
export async function getPublicWebsiteData(tenant: ResolvedTenant): Promise<PublicWebsiteData> {
  const config = await WebsiteConfigModel.findOne({ tenantId: tenant.id }).lean<WebsiteConfigDocument | null>();
  if (!config) {
    log.warn({ tenant: tenant.slug }, "website config missing — rendering with identity defaults");
  }
  return buildPublicWebsiteData(tenant, config);
}

/* ── Platform Admin surface ──────────────────────────────────────────────── */

async function requireTenant(tenantId: string) {
  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) throw apiErrors.tenantNotFound();
  return tenant;
}

/**
 * Read the editable configuration for one tenant. Self-heals: a tenant
 * created before this collection existed (or a wiped row) receives its
 * default document rather than an error.
 */
export async function getWebsiteConfig(tenantId: string): Promise<PublicWebsiteData> {
  const tenant = await requireTenant(tenantId);
  let config = await WebsiteConfigModel.findOne({ tenantId: tenant._id }).lean<WebsiteConfigDocument | null>();
  if (!config) {
    const created = await WebsiteConfigModel.create({
      tenantId: tenant._id,
      contact: {
        ...(tenant.contact?.phone ? { phone: tenant.contact.phone } : {}),
        ...(tenant.contact?.email ? { email: tenant.contact.email } : {}),
        ...(tenant.contact?.address ? { address: tenant.contact.address } : {}),
      },
    });
    config = created.toObject() as WebsiteConfigDocument;
    log.info({ tenantId }, "website config initialized on demand");
  }
  return buildPublicWebsiteData(
    {
      companyName: tenant.companyName,
      slug: tenant.slug,
      contact: tenant.contact ?? {},
    },
    config,
  );
}

/**
 * Apply a validated draft. Deep-merges section-by-section so partial tab
 * saves (e.g. only Branding) never clobber other sections. Mongoose
 * validators remain the final gate; duplicate/validation failures surface
 * as structured API errors.
 */
export async function updateWebsiteConfig(
  tenantId: string,
  draft: WebsiteConfigDraft,
): Promise<PublicWebsiteData> {
  const tenant = await requireTenant(tenantId);
  await getWebsiteConfig(tenantId); // ensure a row exists

  const doc = await WebsiteConfigModel.findOne({ tenantId: tenant._id });
  if (!doc) throw apiErrors.internal("Website configuration could not be loaded.");

  if (draft.branding) doc.branding = { ...doc.branding, ...draft.branding };
  if (draft.navigation) doc.navigation = draft.navigation;
  if (draft.contact) doc.contact = { ...doc.contact, ...draft.contact };
  if (draft.socialLinks) doc.socialLinks = draft.socialLinks;
  if (draft.seo) doc.seo = { ...doc.seo, ...draft.seo };
  if (draft.sectionOrder) doc.sectionOrder = normalizeOrder(draft.sectionOrder);

  if (draft.sections) {
    const next = { ...(doc.sections ?? {}) } as WebsiteConfigDocument["sections"];
    for (const key of [
      "hero",
      "services",
      "about",
      "features",
      "howItWorks",
      "tracking",
      "faq",
      "contact",
      "footer",
    ] as const) {
      const patch = draft.sections[key];
      if (!patch) continue;
      next[key] = { ...(next[key] ?? {}), ...patch } as never;
    }
    doc.sections = next;
    doc.markModified("sections");
  }

  try {
    await doc.save();
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const first = Object.values(error.errors)[0];
      throw apiErrors.validation(first?.message ?? "Website configuration is invalid.");
    }
    throw error;
  }

  log.info({ tenantId, changed: Object.keys(draft) }, "website configuration updated");
  return getWebsiteConfig(tenantId);
}
