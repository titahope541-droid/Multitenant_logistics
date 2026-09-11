/**
 * Website configuration defaults + controlled vocabularies.
 * PURE and client-safe: shared by the Mongoose model, the zod validators,
 * the platform editor UI, and the public renderer so all four agree.
 *
 * Configuration-driven website (locked): no builder, no arbitrary blocks,
 * no per-tenant code — only these known sections with known fields.
 */

/* ── Sections (fixed catalogue; order is configurable, membership is not) ── */

export const WEBSITE_SECTION_KEYS = [
  "hero",
  "services",
  "about",
  "features",
  "tracking",
  "contact",
] as const;

export type WebsiteSectionKey = (typeof WEBSITE_SECTION_KEYS)[number];

export const DEFAULT_SECTION_ORDER: WebsiteSectionKey[] = [
  "hero",
  "services",
  "about",
  "features",
  "tracking",
  "contact",
];

export const SECTION_LABELS: Record<WebsiteSectionKey, string> = {
  hero: "Hero",
  services: "Services",
  about: "About",
  features: "Why Choose Us",
  tracking: "Tracking CTA",
  contact: "Contact",
};

/** Footer is always last — it is chrome, not an orderable section. */
export const FOOTER_LABEL = "Footer";

/* ── Controlled icon vocabulary (no arbitrary markup / no icon uploads) ──── */

export const WEBSITE_ICONS = [
  "truck",
  "package",
  "plane",
  "ship",
  "warehouse",
  "clock",
  "shield",
  "globe",
  "map-pin",
  "headset",
  "badge-check",
  "route",
] as const;

export type WebsiteIcon = (typeof WEBSITE_ICONS)[number];

/* ── Presentation vocabularies ───────────────────────────────────────────── */

export const BUTTON_STYLES = ["square", "rounded", "pill"] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

export const THEME_PREFERENCES = ["light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const FONT_CHOICES = [
  "system",
  "Inter",
  "Space Grotesk",
  "IBM Plex Sans",
  "Source Sans 3",
  "Merriweather",
] as const;

/* ── Default values (used at provisioning AND as render-time fallbacks) ──── */

export const DEFAULT_BRANDING = {
  primaryColor: "#0b5fff",
  secondaryColor: "#0a1020",
  accentColor: "#ff5c1a",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  fontFamily: "system",
  buttonStyle: "square" as ButtonStyle,
  borderRadius: 0,
  theme: "light" as ThemePreference,
} as const;

export const DEFAULT_NAVIGATION = [
  { label: "Home", href: "/", visible: true },
  { label: "Services", href: "#services", visible: true },
  { label: "About", href: "#about", visible: true },
  { label: "Track Package", href: "/track", visible: true },
  { label: "Contact", href: "#contact", visible: true },
];

export const DEFAULT_TRACKING_SECTION = {
  enabled: true,
  heading: "Track your package",
  subtext:
    "Enter your tracking ID to see the latest shipment status, its current location, and the full status timeline — no account required.",
  ctaLabel: "Track package",
};

export const DEFAULT_HERO_CTA_LABEL = "Track your package";
export const DEFAULT_HERO_CTA_HREF = "/track";

/** Content limits — mirrored by the model and the zod boundary. */
export const WEBSITE_LIMITS = {
  navigation: 10,
  services: 8,
  features: 8,
  socialLinks: 8,
} as const;
