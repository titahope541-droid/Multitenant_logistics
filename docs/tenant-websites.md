# Tenant Websites

**IMPLEMENTED IN PHASE 6.** One shared renderer, every tenant's brand.

Core rules (locked):

> One Next.js application. One shared codebase.
> The website is **configuration-driven** from `website_configs`.
> Hostname/subdomain resolves the tenant — never a frontend tenantId.
> Tenant sites carry **no platform branding** (no "Powered by", no portal chrome).
> Images are **URL-based** — no uploads, no asset manager.

---

## 1 · Resolution model

`tenant-resolution.service.ts` is the single decision point:

| Host                                   | Surface                        |
| -------------------------------------- | ------------------------------ |
| `nttrack.com`, `www.`             | platform root (developer portal) |
| `admin.nttrack.com`               | platform admin console (redirect `/admin`) |
| `{slug}.nttrack.com`              | tenant website                 |
| `localhost`, `127.0.0.1`               | platform root (local dev)      |
| `{slug}.localhost`                     | tenant website (local dev)     |
| anything else (incl. multi-level subs) | safe "Website Not Found"       |

Unknown slug → the page never falls back to another tenant — it renders
the generic not-found surface. Pure host parsing is unit-tested
(`tests/tenant-resolution.test.ts`).

**Preview/staging hosts:** `PLATFORM_HOST_SUFFIXES` (env) lists extra
suffixes that serve the PLATFORM surface only — they can never resolve a
tenant. While `NEXT_PUBLIC_PLATFORM_DOMAIN` is still the placeholder
"nttrack.com", the managed preview host suffix is auto-included so
previews land on the developer portal instead of "Website Not Found".
Tenancy behavior behind real DNS (the production model) is unchanged.

### Local development (no DNS needed)

Most OSes/browsers resolve any `*.localhost` to loopback. Then:
`swift.localhost:3000` → the Swift website, `swift.localhost:3000/track`
→ its tracking page, `localhost:3000` → the developer portal,
`localhost:3000/admin` → the platform console. If your browser does not
resolve `*.localhost`, add to `/etc/hosts`:
`127.0.0.1 swift.localhost apex.localhost`.

## 2 · Rendering pipeline

```text
host → SiteResolution → ACTIVE?
    ├─ SUSPENDED/ARCHIVED → generic unavailable page (NO branding, NO
    │                       contact, NO package data — literally a card)
    └─ ACTIVE
        website.service.getPublicWebsiteData(tenant)
          tenant identity + website_configs → PublicWebsiteData
          (public-safe values only; tenantId/_id never included)
        components/website/* — one shared set, every tenant
```

`PublicWebsiteData` resolves fallbacks ONCE, service-side: hero
headline/subtext and tagline fall back to company-identity defaults;
missing config row logs a warning and renders from identity
(`usingDefaults: true`) — an ACTIVE tenant never white-screens over a
missing config.

## 3 · Sections (configuration mapping)

| Section          | Driven by                                                        | Renders when |
| ---------------- | ---------------------------------------------------------------- | ------------ |
| Hero             | `sections.hero` + `branding.heroHeadline/heroSubtext` fallbacks  | `hero.enabled` |
| Services/Features| `sections.services.items[]` (≤8)                                 | `enabled && items.length>0` |
| About            | `sections.about.text`                                            | `enabled && text` |
| Tracking CTA     | static user-flow, branded                                        | `tracking.enabled` |
| Contact          | `contact.{phone,email,address}` (semantic tel:/mailto:/address)  | any configured |
| Nav              | `navigation[]` + Home/Track                                      | always       |
| Footer           | companyName + nav + contact + `socialLinks[]`                    | always       |

Default configs contain no sample services — empty service lists skip the
section; nothing is fabricated for real tenants. Logo renders from
`branding.logoUrl` (URL), with a monogram fallback tile otherwise.

## 4 · Branding

`branding.primaryColor/secondaryColor/fontFamily` become CSS variables on
the page root (`--brand`, `--brand-ink`, `--brand-soft`); every component
consumes them — no tenant-specific CSS exists. Site chrome intentionally
varies from the platform look: tenant sites are light, editorial,
company-first.

## 5 · Images

URL-based only (`branding.logoUrl` today; hero/about art lands with the
Phase-9 website editor extending the same config document). No upload
pipeline exists anywhere in V1 — this is a deliberate architecture
decision, revisited only with explicit approval.

## 6 · SEO foundation

Per-host `generateMetadata`: tenant `title`, meta description,
`canonical https://{slug}.{domain}`, Open Graph title/description/siteName.
`/track` is `noindex, nofollow`. Explicitly out of scope per architecture:
sitemap.xml, robots.txt, SEO dashboards, tenant SEO editors. Per-tenant
favicon is deferred (metadata icons are app-level; a per-host icon route
may land with the website-editor phase).

## 7 · Tenant status behavior

| Status    | Website                                | Tracking |
| --------- | -------------------------------------- | -------- |
| ACTIVE    | normal                                 | normal   |
| SUSPENDED | "Website Temporarily Unavailable" only | disabled |
| ARCHIVED  | same generic unavailable page          | disabled |

The unavailable page is intentionally generic: no company name, no
contact, no branding, no hints about the reason. Platform admin and the
tenant admin console keep working behind their own auth gates regardless.

## 8 · Performance & accessibility

Mobile-first, semantic sectioning, heading order honored, forms labeled,
focus-visible states everywhere the design system lives, reduced motion
respected (no decorative motion on tenant sites), near-zero client JS on
website pages (nav toggle + tracking island only), and lightweight
CSS-variable branding instead of recolored stylesheets.

## 9 · Failure modes

Unknown host/slug → "Website Not Found" · suspended/archived → generic
unavailable · website-service DB failure → generic error page + pino log
· missing config → identity defaults + warning log. None of these ever
leaks internals.
