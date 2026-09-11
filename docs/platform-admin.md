# Platform Admin

**IMPLEMENTED Phase 4 (tenants) · Phase 8 (console + website management).**

The platform owner's control plane at `/admin` (production host:
`admin.{platformDomain}`; locally `localhost:3000/admin`). Every page is
SSR-guarded for `PLATFORM_ADMIN`, and every endpoint behind it re-checks
the role server-side — hidden UI is never the control.

---

## 1 · Permissions

| Platform Admin can | Platform Admin cannot |
| ------------------ | --------------------- |
| Create/edit tenants, run the lifecycle, reset the tenant admin's password | Retrieve any existing password (hashes only) |
| Edit website content, branding, navigation, sections, order, SEO | Delete a tenant or its data (no hard delete exists) |
| View a tenant's packages read-only ("open tenant dashboard") | Mutate packages, statuses, or locations (tenant-admin surface) |
| See platform-wide metrics | Bypass authorization ("privileged, not invisible") |

Tenant Admins are confined to packages + their own account
(`docs/tenant-management.md`, `docs/website-configuration.md §9`).

## 2 · Navigation

`Overview · Tenants · Settings · Sign out` — nothing else. No billing,
customers, marketing, support, staff, subscriptions or invoices (out of
V1 by decision).

## 3 · Overview

`GET /api/v1/platform/stats` → tenant lifecycle counts (total / active /
suspended / archived) and package totals (total / active shipments /
delivered, where "active" = the four non-DELIVERED locked statuses,
archived packages excluded).

## 4 · Tenants list

Server-side search (company, slug, admin name, admin email), status
filters (All / Active / Suspended / Archived — All shows active +
suspended), whitelisted sorts (Newest / Oldest / Most packages / Company
name), server-side pagination (≤50/page) with `{page, limit, total,
totalPages}`. Row actions: **Manage** (detail), **Quick view** (drawer),
and lifecycle buttons appropriate to the current status.

## 5 · Tenant detail tabs

| Tab | Contents |
| --- | -------- |
| **Overview** | company info form (name, phone, email, address), facts (subdomain, status, admin, package count, website state, timestamps) |
| **Website** | section visibility + ordering, hero, services, about, features, tracking CTA, contact/hours, footer + social, SEO |
| **Branding** | logo/favicon URLs, tagline, five-color palette, typeface, button style, radius, theme, live swatch preview |
| **Admin** | tenant admin name/email/status + password reset (one-time reveal) |
| **Packages** | server-authorized read-only list of that tenant's shipments |
| **Settings** | lifecycle state and everything derived from it, plus lifecycle actions |

Header actions: **Preview website** and the lifecycle buttons. Dangerous
actions (suspend, archive, reset) use two-step confirmation with an
explicit consequence label.

## 6 · Password reset

Generates a one-time temporary password → Argon2id hash → replaces the
stored hash → destroys every session of that admin. The plaintext is
shown exactly once, never emailed, never retrievable
(`docs/authentication.md`).

## 7 · Open tenant dashboard

`GET /api/v1/platform/tenants/:tenantId/packages` — the Platform Admin
reads one tenant's packages **while remaining a Platform Admin**: no
credential borrowing, no session swap, no impersonation token. The query
is explicitly scoped to the requested tenantId, and the capability is
read-only; mutations remain on the tenant's own authenticated surface.
No client-visible audit log is built (explicitly out of scope); ordinary
structured logs record platform mutations.

## 8 · Lifecycle from the console

`ACTIVE ⇄ SUSPENDED`, `ACTIVE → ARCHIVED`, `ARCHIVED → ACTIVE`; invalid
transitions are refused with `400 INVALID_TENANT_STATUS`. Suspension and
archival immediately destroy that tenant's admin sessions and disable the
public website, tracking, and realtime subscriptions. Data is always
retained — restoration is status-only.
