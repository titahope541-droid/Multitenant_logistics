# Website Configuration

**IMPLEMENTED Phase 6 (rendering) · Phase 8 (editing).**

> Website configuration is a **PLATFORM_ADMIN capability**.
> Tenant Admins cannot read or write it — there is deliberately no
> `/api/v1/admin/website*` route anywhere in the codebase.

---

## 1 · Model (`website_configs`, one document per tenant)

Unique `tenantId`. Sections are a **fixed catalogue** — this is
configuration, not a page builder (no blocks, no arbitrary HTML, no
per-tenant code).

| Group | Fields |
| ----- | ------ |
| `branding` | logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, backgroundColor, textColor, fontFamily, buttonStyle (`square`/`rounded`/`pill`), borderRadius (0–32), theme (`light`/`dark`), tagline |
| `navigation[≤10]` | label, href, visible |
| `sections.hero` | enabled, headline, subtext, ctaLabel, ctaHref, imageUrl |
| `sections.services` | enabled, title, items[≤8]{title, label?, description?, icon?, imageUrl?, visible} |
| `sections.about` | enabled, title, text, imageUrl |
| `sections.features` | enabled, title, items[≤8]{…} (“Why choose us”) |
| `sections.tracking` | enabled, heading, subtext, ctaLabel |
| `sections.howItWorks` | enabled, title, steps[≤5]{title, description} — default copy describes the real tracking flow |
| `sections.faq` | enabled, title, items[≤12]{question, answer, visible} — defaults describe real platform behaviour |
| `sections.contact` | enabled, hours (+ phone/email/address on `contact`) |
| `sections.footer` | enabled, text, showNavigation, showSocial |
| `sectionOrder` | permutation of hero · services · about · features · howItWorks · tracking · faq · contact |
| `socialLinks[≤8]` | platform (free text), url |
| `seo` | title, description, ogTitle, ogDescription, ogImageUrl |

## 2 · Rendering pipeline

```text
hostname → tenant → status ACTIVE?
   → website_configs → buildPublicWebsiteData() (safe defaults applied ONCE)
   → the shared renderer: sections emitted in sectionOrder, skipping
     disabled/empty ones; footer always last
```

Branding becomes CSS variables (`--brand`, `--brand-ink`, `--brand-accent`,
`--brand-soft`, `--brand-radius`) plus background/text/font on the root —
no tenant-specific CSS, no style injection (values are validated hex /
enums / bounded numbers).

### Landing-page additions (latest UI phase)

Two optional sections were added to the SAME `website_configs` document —
no new collection, no second configuration system:

* **How it works** — up to five numbered steps. Defaults describe the real
  tracking experience (receive ID → enter it → follow the shipment); no
  invented claims.
* **FAQ** — up to twelve question/answer pairs in an accessible accordion.
  Defaults answer tracking questions accurately (how to track, what the
  five statuses mean, why a status may not have changed).

Service/feature cards also gained optional `label` (category chip) and
`imageUrl` (URL-based imagery only). All additions are optional with
defaults, so existing tenants render unchanged except for two new sections
appearing at their default positions — order normalization inserts newly
added sections at their default position rather than appending them last.
Both are editable from the Platform Admin Website tab.

## 3 · Section visibility & ordering

Every section has an `enabled` flag; the Website tab exposes On/Off plus
**Move up / Move down** (no drag-and-drop). Stored orders are normalized
on read: unknown keys are dropped, duplicates collapsed, and any missing
section is appended — a malformed order can never make a section vanish.

## 4 · URL-based images (locked)

`branding.logoUrl`, `branding.faviconUrl`, `sections.hero.imageUrl`,
`sections.about.imageUrl`, `seo.ogImageUrl` are **http(s) URLs**. There is
no upload API, no asset collection, no storage bucket, no file manager.

> A publicly reachable URL is **not** automatically licensed for
> commercial reuse. Use assets the tenant is legally entitled to use.

Failures degrade: `SiteImage` drops a broken decorative image and shows a
neutral placeholder for content images — the layout always survives.

## 5 · Validation (content stays content)

zod at the request boundary + Mongoose at the data boundary:
text fields reject `<`/`>` (no markup, no scripts), colors must be `#hex`,
URLs must be http(s), icons come from a controlled vocabulary, section
keys come from the fixed catalogue, `.strict()` rejects unknown keys, and
every list has a maximum length. Model validation failures surface as
`400 VALIDATION_ERROR`, never raw Mongoose errors.

## 6 · SEO

Editable: page title, meta description, OG title/description/image;
favicon via branding. Applied by `generateMetadata` per tenant host with
identity fallbacks and a canonical `https://{slug}.{platformDomain}`.
Tracking pages remain `noindex, nofollow`. Explicitly NOT built:
sitemap.xml, robots.txt, SEO dashboards, structured-data editors.

## 7 · Save / publish model

Edit → Save → live. One PATCH per tab; the service deep-merges section by
section so a Branding save never clobbers Website content. No drafts, no
versioning, no scheduling, no rollback (V1 scope).

**Preview:** `/admin/tenants/{id}/preview` renders the SAME shared
renderer against the saved configuration behind the PLATFORM_ADMIN page
guard — not a public URL, not a second deployment. Suspended/archived
tenants remain previewable internally while their public host stays dark.

## 8 · Safe defaults

Missing config row → identity-driven defaults (`usingDefaults: true`,
warning logged) and a self-healing initialization on the first platform
read. Missing individual fields → per-field fallbacks. An ACTIVE tenant
always renders a usable website.

## 9 · What Tenant Admins cannot do

No website, branding, navigation, hero, services, about, features,
footer, SEO, section visibility or ordering access — not in the UI, and
crucially not in the API (`/platform/*` is `PLATFORM_ADMIN`-gated; the
tenant surface `/api/v1/admin/*` contains packages + geocoding only).
Verified by `tests/website-config.test.ts`.
