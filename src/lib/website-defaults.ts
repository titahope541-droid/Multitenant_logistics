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
  "howItWorks",
  "tracking",
  "faq",
  "contact",
] as const;

export type WebsiteSectionKey = (typeof WEBSITE_SECTION_KEYS)[number];

export const DEFAULT_SECTION_ORDER: WebsiteSectionKey[] = [
  "hero",
  "services",
  "about",
  "features",
  "howItWorks",
  "tracking",
  "faq",
  "contact",
];

export const SECTION_LABELS: Record<WebsiteSectionKey, string> = {
  hero: "Hero",
  services: "Services",
  about: "About",
  features: "Why Choose Us",
  howItWorks: "How It Works",
  tracking: "Tracking CTA",
  faq: "FAQ",
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
  { label: "Features", href: "#features", visible: true },
  { label: "Track Package", href: "/track", visible: true },
  { label: "Contact", href: "#contact", visible: true },
];

export const DEFAULT_TRACKING_SECTION = {
  enabled: true,
  heading: "Where is your package?",
  subtext:
    "Enter your tracking ID to see the current status, the full delivery timeline, and your package's latest location.",
  ctaLabel: "Track my package",
};

export const DEFAULT_HERO_CTA_LABEL = "Track Your Package";
export const DEFAULT_HERO_CTA_HREF = "/track";

/**
 * Default "how it works" copy. It describes what the platform ACTUALLY does
 * (ID lookup → tracking page → live status/location) — no invented claims.
 */
export const DEFAULT_HOW_IT_WORKS = {
  title: "How tracking works",
  steps: [
    {
      title: "Receive your tracking ID",
      description:
        "The company shipping your package gives you a unique tracking ID for this shipment.",
    },
    {
      title: "Enter it on the tracking page",
      description:
        "Open the tracking page and paste your ID — no account and no sign-in required.",
    },
    {
      title: "Follow your shipment",
      description:
        "See the current status, the full delivery timeline, and the package's latest location.",
    },
  ],
} as const;

/**
 * Default FAQ entries. Every answer describes real platform behaviour —
 * never business policies, guarantees, or invented numbers. Platform admins
 * can edit or disable them per tenant.
 */
export const DEFAULT_FAQ = {
  title: "Frequently asked questions",
  items: [
    {
      question: "How do I track my package?",
      answer:
        "Open the tracking page and enter the tracking ID you were given. You will see the current status, the full delivery timeline, and the latest recorded location — no account needed.",
      visible: true,
    },
    {
      question: "What do I need to track a shipment?",
      answer:
        "Only the tracking ID. It was provided by the company that shipped your package and looks like PKG-XXX-00000000-XXXXXX.",
      visible: true,
    },
    {
      question: "What do the shipment statuses mean?",
      answer:
        "Every shipment moves through five stages: Pending, Processed, In Transit, Arrived at Facility, and Delivered. Your timeline shows each stage with the date it happened.",
      visible: true,
    },
    {
      question: "Why hasn't my shipment status changed?",
      answer:
        "Statuses are updated by the shipping company as your package moves. If nothing has changed for a while, contact them using the details on this page.",
      visible: true,
    },
  ],
} as const;

/** Content limits — mirrored by the model and the zod boundary. */
export const WEBSITE_LIMITS = {
  navigation: 10,
  services: 8,
  features: 8,
  socialLinks: 8,
  faq: 12,
  steps: 5,
} as const;
