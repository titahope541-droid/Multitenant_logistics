/**
 * WebsiteConfig model — the configuration-driven definition of a tenant's
 * public website. IMPLEMENTED Phase 2, EXTENDED Phase 8.
 *
 * Locked separation: Tenant = identity/status/contact (operations),
 * WebsiteConfig = presentation. Exactly one config per tenant (unique
 * index). **PLATFORM_ADMIN controlled only** — Tenant Admins have no
 * read/write path to these documents (docs/website-configuration.md).
 *
 * V1 has no tenant uploads: every image is a URL string. Every content
 * field is TEXT (no HTML), every color/URL/icon is validated, and the
 * section catalogue is fixed — this is configuration, not a page builder.
 */

import { Schema, model, models, type Model, type Types } from "mongoose";
import { EMAIL_PATTERN, HEX_COLOR_PATTERN, HTTP_URL_PATTERN } from "@/lib/validation-patterns";
import {
  BUTTON_STYLES,
  DEFAULT_BRANDING,
  DEFAULT_FAQ,
  DEFAULT_HERO_CTA_HREF,
  DEFAULT_HERO_CTA_LABEL,
  DEFAULT_HOW_IT_WORKS,
  DEFAULT_NAVIGATION,
  DEFAULT_SECTION_ORDER,
  DEFAULT_TRACKING_SECTION,
  THEME_PREFERENCES,
  WEBSITE_ICONS,
  WEBSITE_LIMITS,
  WEBSITE_SECTION_KEYS,
  type ButtonStyle,
  type ThemePreference,
  type WebsiteIcon,
  type WebsiteSectionKey,
} from "@/lib/website-defaults";

/* ── Document shapes ─────────────────────────────────────────────────────── */

export interface BrandingDoc {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  buttonStyle?: ButtonStyle;
  borderRadius?: number;
  theme?: ThemePreference;
  tagline?: string;
}

export interface NavigationItemDoc {
  label: string;
  href: string;
  visible?: boolean;
}

export interface CardItemDoc {
  title: string;
  /** Small category chip, e.g. "Local". */
  label?: string;
  description?: string;
  icon?: WebsiteIcon;
  /** URL-based imagery only — there is no upload system. */
  imageUrl?: string;
  visible?: boolean;
}

export interface StepItemDoc {
  title: string;
  description?: string;
}

export interface FaqItemDoc {
  question: string;
  answer: string;
  visible?: boolean;
}

export interface SectionsDoc {
  hero: { enabled: boolean; headline?: string; subtext?: string; ctaLabel?: string; ctaHref?: string; imageUrl?: string };
  services: { enabled: boolean; title?: string; items: CardItemDoc[] };
  about: { enabled: boolean; title?: string; text?: string; imageUrl?: string };
  features: { enabled: boolean; title?: string; items: CardItemDoc[] };
  tracking: { enabled: boolean; heading?: string; subtext?: string; ctaLabel?: string };
  howItWorks: { enabled: boolean; title?: string; steps: StepItemDoc[] };
  faq: { enabled: boolean; title?: string; items: FaqItemDoc[] };
  contact: { enabled: boolean; hours?: string };
  footer: { enabled: boolean; text?: string; showNavigation?: boolean; showSocial?: boolean };
}

export interface SeoDoc {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
}

export interface WebsiteConfigDocument {
  tenantId: Types.ObjectId;
  branding: BrandingDoc;
  navigation: NavigationItemDoc[];
  sections: SectionsDoc;
  sectionOrder: WebsiteSectionKey[];
  contact: { phone?: string; email?: string; address?: string };
  socialLinks: Array<{ platform: string; url: string }>;
  seo: SeoDoc;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Reusable validators ─────────────────────────────────────────────────── */

const hex = [HEX_COLOR_PATTERN, "expected a #hex color"] as const;
const url = [HTTP_URL_PATTERN, "expected an http(s) URL"] as const;

const brandingSchema = new Schema<BrandingDoc>(
  {
    logoUrl: { type: String, trim: true, maxlength: 500, match: url },
    faviconUrl: { type: String, trim: true, maxlength: 500, match: url },
    primaryColor: { type: String, trim: true, match: hex, default: DEFAULT_BRANDING.primaryColor },
    secondaryColor: { type: String, trim: true, match: hex, default: DEFAULT_BRANDING.secondaryColor },
    accentColor: { type: String, trim: true, match: hex, default: DEFAULT_BRANDING.accentColor },
    backgroundColor: { type: String, trim: true, match: hex, default: DEFAULT_BRANDING.backgroundColor },
    textColor: { type: String, trim: true, match: hex, default: DEFAULT_BRANDING.textColor },
    fontFamily: { type: String, trim: true, maxlength: 80, default: DEFAULT_BRANDING.fontFamily },
    buttonStyle: { type: String, enum: { values: [...BUTTON_STYLES] }, default: DEFAULT_BRANDING.buttonStyle },
    borderRadius: { type: Number, min: 0, max: 32, default: DEFAULT_BRANDING.borderRadius },
    theme: { type: String, enum: { values: [...THEME_PREFERENCES] }, default: DEFAULT_BRANDING.theme },
    tagline: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const navigationItemSchema = new Schema<NavigationItemDoc>(
  {
    label: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    href: { type: String, required: true, trim: true, maxlength: 200 },
    visible: { type: Boolean, default: true },
  },
  { _id: false },
);

const cardItemSchema = new Schema<CardItemDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 400 },
    icon: { type: String, enum: { values: [...WEBSITE_ICONS] } },
    imageUrl: { type: String, trim: true, maxlength: 500, match: url },
    visible: { type: Boolean, default: true },
  },
  { _id: false },
);

const stepItemSchema = new Schema<StepItemDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const faqItemSchema = new Schema<FaqItemDoc>(
  {
    question: { type: String, required: true, trim: true, minlength: 5, maxlength: 160 },
    answer: { type: String, required: true, trim: true, maxlength: 1000 },
    visible: { type: Boolean, default: true },
  },
  { _id: false },
);

const sectionsSchema = new Schema<SectionsDoc>(
  {
    hero: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: true },
          headline: { type: String, trim: true, maxlength: 140 },
          subtext: { type: String, trim: true, maxlength: 300 },
          ctaLabel: { type: String, trim: true, maxlength: 40, default: DEFAULT_HERO_CTA_LABEL },
          ctaHref: { type: String, trim: true, maxlength: 200, default: DEFAULT_HERO_CTA_HREF },
          imageUrl: { type: String, trim: true, maxlength: 500, match: url },
        },
        { _id: false },
      ),
      default: () => ({ enabled: true }),
    },
    services: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: false },
          title: { type: String, trim: true, maxlength: 80, default: "Services" },
          items: {
            type: [cardItemSchema],
            default: [],
            validate: { validator: (v: CardItemDoc[]) => v.length <= WEBSITE_LIMITS.services, message: "too many services" },
          },
        },
        { _id: false },
      ),
      default: () => ({ enabled: false, items: [] }),
    },
    about: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: false },
          title: { type: String, trim: true, maxlength: 80, default: "About us" },
          text: { type: String, trim: true, maxlength: 2000 },
          imageUrl: { type: String, trim: true, maxlength: 500, match: url },
        },
        { _id: false },
      ),
      default: () => ({ enabled: false }),
    },
    features: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: false },
          title: { type: String, trim: true, maxlength: 80, default: "Why choose us" },
          items: {
            type: [cardItemSchema],
            default: [],
            validate: { validator: (v: CardItemDoc[]) => v.length <= WEBSITE_LIMITS.features, message: "too many features" },
          },
        },
        { _id: false },
      ),
      default: () => ({ enabled: false, items: [] }),
    },
    tracking: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: true },
          heading: { type: String, trim: true, maxlength: 120, default: DEFAULT_TRACKING_SECTION.heading },
          subtext: { type: String, trim: true, maxlength: 300, default: DEFAULT_TRACKING_SECTION.subtext },
          ctaLabel: { type: String, trim: true, maxlength: 40, default: DEFAULT_TRACKING_SECTION.ctaLabel },
        },
        { _id: false },
      ),
      default: () => ({ enabled: true }),
    },
    howItWorks: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: true },
          title: { type: String, trim: true, maxlength: 80, default: DEFAULT_HOW_IT_WORKS.title },
          steps: {
            type: [stepItemSchema],
            default: () => DEFAULT_HOW_IT_WORKS.steps.map((step) => ({ ...step })),
            validate: {
              validator: (steps: StepItemDoc[]) => steps.length <= WEBSITE_LIMITS.steps,
              message: `howItWorks supports at most ${WEBSITE_LIMITS.steps} steps`,
            },
          },
        },
        { _id: false },
      ),
      default: () => ({ enabled: true }),
    },
    faq: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: true },
          title: { type: String, trim: true, maxlength: 80, default: DEFAULT_FAQ.title },
          items: {
            type: [faqItemSchema],
            default: () => DEFAULT_FAQ.items.map((item) => ({ ...item })),
            validate: {
              validator: (items: FaqItemDoc[]) => items.length <= WEBSITE_LIMITS.faq,
              message: `faq supports at most ${WEBSITE_LIMITS.faq} entries`,
            },
          },
        },
        { _id: false },
      ),
      default: () => ({ enabled: true }),
    },
    contact: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: true },
          hours: { type: String, trim: true, maxlength: 200 },
        },
        { _id: false },
      ),
      default: () => ({ enabled: true }),
    },
    footer: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: true },
          text: { type: String, trim: true, maxlength: 300 },
          showNavigation: { type: Boolean, default: true },
          showSocial: { type: Boolean, default: true },
        },
        { _id: false },
      ),
      default: () => ({ enabled: true }),
    },
  },
  { _id: false },
);

const contactSchema = new Schema<WebsiteConfigDocument["contact"]>(
  {
    phone: { type: String, trim: true, maxlength: 40 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, "contact.email must be a valid email address"],
    },
    address: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const socialLinkSchema = new Schema<{ platform: string; url: string }>(
  {
    platform: { type: String, required: true, trim: true, maxlength: 40 },
    url: { type: String, required: true, trim: true, maxlength: 300, match: url },
  },
  { _id: false },
);

const seoSchema = new Schema<SeoDoc>(
  {
    title: { type: String, trim: true, maxlength: 70 },
    description: { type: String, trim: true, maxlength: 200 },
    ogTitle: { type: String, trim: true, maxlength: 70 },
    ogDescription: { type: String, trim: true, maxlength: 200 },
    ogImageUrl: { type: String, trim: true, maxlength: 500, match: url },
  },
  { _id: false },
);

const websiteConfigSchema = new Schema<WebsiteConfigDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true, // → unique index: exactly one config per tenant
    },
    branding: { type: brandingSchema, default: () => ({}) },
    navigation: {
      type: [navigationItemSchema],
      default: () => DEFAULT_NAVIGATION.map((item) => ({ ...item })),
      validate: {
        validator: (items: NavigationItemDoc[]) => items.length <= WEBSITE_LIMITS.navigation,
        message: `navigation supports at most ${WEBSITE_LIMITS.navigation} items`,
      },
    },
    sections: { type: sectionsSchema, default: () => ({}) },
    sectionOrder: {
      type: [String],
      enum: { values: [...WEBSITE_SECTION_KEYS] },
      default: () => [...DEFAULT_SECTION_ORDER],
    },
    contact: { type: contactSchema, default: () => ({}) },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
      validate: {
        validator: (items: Array<{ platform: string; url: string }>) => items.length <= WEBSITE_LIMITS.socialLinks,
        message: `socialLinks supports at most ${WEBSITE_LIMITS.socialLinks} entries`,
      },
    },
    seo: { type: seoSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "website_configs" },
);

export const WebsiteConfigModel: Model<WebsiteConfigDocument> =
  (models.WebsiteConfig as Model<WebsiteConfigDocument> | undefined) ??
  model<WebsiteConfigDocument>("WebsiteConfig", websiteConfigSchema);
