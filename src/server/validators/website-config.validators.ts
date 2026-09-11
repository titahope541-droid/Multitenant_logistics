/**
 * WebsiteConfig validators — the PLATFORM ADMIN request boundary.
 *
 * Rules enforced here (docs/website-configuration.md §validation):
 *   · every content field is TEXT — no HTML, no scripts, no raw markup
 *   · every image/social value is an http(s) URL (URL-based images only)
 *   · colors are #hex, icons come from the controlled vocabulary,
 *     section keys come from the fixed catalogue
 *   · `.strict()` everywhere → unknown keys are rejected outright, so a
 *     client cannot smuggle new "sections" into the configuration model
 */

import { z } from "zod";
import {
  BUTTON_STYLES,
  THEME_PREFERENCES,
  WEBSITE_ICONS,
  WEBSITE_LIMITS,
  WEBSITE_SECTION_KEYS,
} from "@/lib/website-defaults";
import {
  emailSchema,
  freeText,
  hexColorSchema,
  httpUrlSchema,
  phoneSchema,
} from "@/server/validators/common";

/* Reject anything that looks like markup in plain-text content fields. */
const noMarkup = (value: string) => !/[<>]/.test(value);
const plainText = (max: number) =>
  z.string().trim().max(max).refine(noMarkup, { message: "must not contain markup" });

const cardItemSchema = z
  .object({
    title: freeText(80).refine(noMarkup, { message: "must not contain markup" }),
    description: plainText(400).optional(),
    icon: z.enum(WEBSITE_ICONS).optional(),
    visible: z.boolean().default(true),
  })
  .strict();

export const brandingUpdateSchema = z
  .object({
    logoUrl: httpUrlSchema.optional(),
    faviconUrl: httpUrlSchema.optional(),
    primaryColor: hexColorSchema.optional(),
    secondaryColor: hexColorSchema.optional(),
    accentColor: hexColorSchema.optional(),
    backgroundColor: hexColorSchema.optional(),
    textColor: hexColorSchema.optional(),
    fontFamily: plainText(80).optional(),
    buttonStyle: z.enum(BUTTON_STYLES).optional(),
    borderRadius: z.number().int().min(0).max(32).optional(),
    theme: z.enum(THEME_PREFERENCES).optional(),
    tagline: plainText(160).optional(),
  })
  .strict();

export const websiteUpdateSchema = z
  .object({
    branding: brandingUpdateSchema.optional(),
    navigation: z
      .array(
        z
          .object({
            label: freeText(40).refine(noMarkup, { message: "must not contain markup" }),
            href: freeText(200),
            visible: z.boolean().default(true),
          })
          .strict(),
      )
      .max(WEBSITE_LIMITS.navigation)
      .optional(),
    sections: z
      .object({
        hero: z
          .object({
            enabled: z.boolean().optional(),
            headline: plainText(140).optional(),
            subtext: plainText(300).optional(),
            ctaLabel: plainText(40).optional(),
            ctaHref: plainText(200).optional(),
            imageUrl: httpUrlSchema.optional(),
          })
          .strict()
          .optional(),
        services: z
          .object({
            enabled: z.boolean().optional(),
            title: plainText(80).optional(),
            items: z.array(cardItemSchema).max(WEBSITE_LIMITS.services).optional(),
          })
          .strict()
          .optional(),
        about: z
          .object({
            enabled: z.boolean().optional(),
            title: plainText(80).optional(),
            text: plainText(2000).optional(),
            imageUrl: httpUrlSchema.optional(),
          })
          .strict()
          .optional(),
        features: z
          .object({
            enabled: z.boolean().optional(),
            title: plainText(80).optional(),
            items: z.array(cardItemSchema).max(WEBSITE_LIMITS.features).optional(),
          })
          .strict()
          .optional(),
        tracking: z
          .object({
            enabled: z.boolean().optional(),
            heading: plainText(120).optional(),
            subtext: plainText(300).optional(),
            ctaLabel: plainText(40).optional(),
          })
          .strict()
          .optional(),
        contact: z
          .object({
            enabled: z.boolean().optional(),
            hours: plainText(200).optional(),
          })
          .strict()
          .optional(),
        footer: z
          .object({
            enabled: z.boolean().optional(),
            text: plainText(300).optional(),
            showNavigation: z.boolean().optional(),
            showSocial: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    /** Fixed catalogue, no duplicates — ordering only. */
    sectionOrder: z
      .array(z.enum(WEBSITE_SECTION_KEYS))
      .max(WEBSITE_SECTION_KEYS.length)
      .refine((keys) => new Set(keys).size === keys.length, { message: "duplicate section keys" })
      .optional(),
    contact: z
      .object({
        phone: phoneSchema.optional(),
        email: emailSchema.optional(),
        address: plainText(300).optional(),
      })
      .strict()
      .optional(),
    socialLinks: z
      .array(
        z
          .object({ platform: freeText(40), url: httpUrlSchema.max(300) })
          .strict(),
      )
      .max(WEBSITE_LIMITS.socialLinks)
      .optional(),
    seo: z
      .object({
        title: plainText(70).optional(),
        description: plainText(200).optional(),
        ogTitle: plainText(70).optional(),
        ogDescription: plainText(200).optional(),
        ogImageUrl: httpUrlSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type WebsiteUpdateInput = z.infer<typeof websiteUpdateSchema>;
export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>;
