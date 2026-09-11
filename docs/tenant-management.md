# Tenant Management

**IMPLEMENTED IN PHASE 4.** Everything the Platform Admin can do with
tenants, and the guarantees the system makes while doing it. Tenant Admins
have **no** tenant-management capability — the backend rejects them
(`403 FORBIDDEN`) before any handler logic runs.

---

## 1 · The tenant concept

A tenant is one logistics company: identity (`companyName`, `slug`,
`contact`) and lifecycle `status` in `tenants`; presentation config in
`website_configs`; operations team of exactly one `TENANT_ADMIN` user.
Nothing else lives on the tenant document (locked separation).

## 2 · Lifecycle

Exactly three statuses, with a drawn transition matrix:

```text
ACTIVE ⇄ SUSPENDED
ACTIVE  → ARCHIVED
ARCHIVED→ ACTIVE
```

| Transition          | Endpoint   | Effect                                                     |
| ------------------- | ---------- | ---------------------------------------------------------- |
| ACTIVE → SUSPENDED  | `suspend`  | login/API blocked, live sessions destroyed, data kept      |
| SUSPENDED → ACTIVE  | `restore`  | status change only — nothing recreated                     |
| ACTIVE → ARCHIVED   | `archive`  | like suspend + hidden from normal lists, data kept         |
| ARCHIVED → ACTIVE   | `restore`  | status change only                                         |
| anything else       | —          | `400 INVALID_TENANT_STATUS` with the allowed set           |

There is **no hard-delete** operation anywhere in the platform.

Behavior when suspended/archived: public site + tracking disabled (the
Phase 4 suspension page and Phase 5 tracking gate read the same status),
tenant-admin login/API blocked (Phase 3 login gate; `403 TENANT_SUSPENDED`
per request), platform admin unaffected. Archived tenants are excluded
from the default `ALL` list filter and surface under the dedicated
`ARCHIVED` filter.

## 3 · Creation (atomic provisioning)

```text
POST /api/v1/platform/tenants
  → zod boundary (createTenantWithAdminSchema)
  → slug: normalize → pattern → reserved-list → uniqueness pre-check
  → admin email uniqueness pre-check
  → password: provided or server-generated temporary (policy-checked)
  → Argon2id hash
  → TRANSACTION:
        1. tenants.insert            (status ACTIVE)
        2. users.insert              (TENANT_ADMIN, tenantId, ACTIVE)
        3. website_configs.insert    (default config + company contact)
  → 201 { tenant, admin, temporaryPassword? }
```

**Failures roll back everything.** On replica-set/Atlas deployments this is
a real MongoDB transaction (`withTransaction`). On a standalone mongod —
which does not support transactions — the service falls back to sequential
creation with explicit compensating deletes (documented in
`src/server/services/tenant.service.ts`); the invariant is identical:
**no tenant without its admin, no tenant without its WebsiteConfig, no
orphans of either kind.** The transaction test suite proves rollback
(`tests/tenant.service.test.ts`).

Local-dev requirement for the transactional path: run mongod as a
single-node replica set (`mongod --replSet rs0` then `rs.initiate()`) or
use Atlas; without it the service logs and uses the rollback fallback.

### Password handling

Temporary passwords are generated with crypto-randomness in
`xxxx-xxxx-xxxx` form, shown **exactly once** in the creation response
(only when generated), never stored, never logged, never retrievable.
The admin's stored value is always the Argon2id hash.

## 4 · Tenant admin — the one-admin invariant

Each tenant has exactly one `TENANT_ADMIN` user, enforced twice:

1. Application: provisioning is the only creation path.
2. Database: the partial unique index
   `{ tenantId: 1 } where role = TENANT_ADMIN` (Phase 2) rejects duplicates
   even under races; the service maps `11000` on that index to
   `409 TENANT_ADMIN_ALREADY_EXISTS`.

There is no staff/team/invitation model.

## 5 · WebsiteConfig initialization

Created atomically with the tenant: defaults from the model (hero +
tracking sections enabled, services/about disabled, empty navigation and
social links) plus the company contact carried into the website contact.
One config per tenant is enforced by the unique `tenantId` index
(test-verified). Branding/customization is Platform-Admin work in Phases
7/9 — the management surface here only verifies `websiteConfigured`.

## 6 · Slug rules

* Normalized: lowercase, spaces/underscores → hyphens, unsafe characters
  stripped, hyphens collapsed/trimmed (`"Swift Logistics!" → "swift-logistics"`).
* Validated: `^[a-z0-9]+(-[a-z0-9]+)*$`, 2–48 characters.
* Reserved names rejected: `admin`, `www`, `api`, `app`, `status`, `docs`,
  `mail`, `email`, `support`, `help`, `login`, `auth`, `platform`,
  `dashboard` → `400 TENANT_SLUG_RESERVED`.
* Unique platform-wide (application pre-check + unique index, 409 on
  conflict — upgrades from app error to DB error are also mapped).
* Editing a slug re-validates the same rules against other tenants; the
  tenant `_id` never changes.

No DNS configuration and no custom domains happen in V1 (locked).

## 7 · Listing: search · filters · sort · pagination

`GET /api/v1/platform/tenants` — single aggregation pipeline:

| Parameter | Values                                                        | Default |
| --------- | ------------------------------------------------------------- | ------- |
| `search`  | free text — company name, slug, **admin name, admin email**   | —       |
| `status`  | `ALL` (ACTIVE+SUSPENDED) · `ACTIVE` · `SUSPENDED` · `ARCHIVED`| `ALL`   |
| `sort`    | `newest` · `oldest` · `most_packages` · `company_name`        | `newest`|
| `page`    | ≥ 1                                                           | 1       |
| `limit`   | 1–50 (server clamps)                                          | 20      |

`most_packages` computes live from the `packages` collection in the same
pipeline. Response: `{ items: TenantListItem[], page, limit, total, totalPages }`
where each item carries company, slug, status, admin summary, package
count, and timestamps — never hashes/sessions/internals.

## 8 · Endpoints (all `PLATFORM_ADMIN`-gated)

| Method | Path                                          | Purpose                              |
| ------ | --------------------------------------------- | ------------------------------------ |
| GET    | `/api/v1/platform/tenants`                    | list/search/filter/sort/paginate     |
| POST   | `/api/v1/platform/tenants`                    | atomic provisioning (201)            |
| GET    | `/api/v1/platform/tenants/:tenantId`          | details (identity + admin + counts)  |
| PATCH  | `/api/v1/platform/tenants/:tenantId`          | edit company info / slug             |
| POST   | `/api/v1/platform/tenants/:tenantId/suspend`  | ACTIVE → SUSPENDED                   |
| POST   | `/api/v1/platform/tenants/:tenantId/archive`  | ACTIVE → ARCHIVED                    |
| POST   | `/api/v1/platform/tenants/:tenantId/restore`  | SUSPENDED/ARCHIVED → ACTIVE          |
| POST   | `/api/v1/platform/tenants/:tenantId/admin/reset-password` | reset admin password (one-time reveal) |

Full request/response/error detail: `docs/api.md §platform`.

## 9 · Password reset

Generates a new temporary password → Argon2id hash → replaces
`passwordHash` → **destroys every session of that admin**. The old
password is unretrievable by design; the new one is returned exactly once.
The platform admin never sees any existing password.

## 10 · Platform Admin cross-tenant access

Privileged but never invisible: every platform endpoint runs behind the
explicit `PLATFORM_ADMIN` gate, mutations are pino-logged (tenantId,
action, session invalidations), and there is no `if admin → skip checks"
path. An "open tenant dashboard" flow for Phase 8 will ride on the same
server-authorized mechanism — no client-side impersonation, no
browser-set `tenantId`.

## 11 · Tenant isolation (unchanged)

This feature set is platform-scoped and therefore cross-tenant **by
intention**. Nothing here leaks into tenant-scoped surfaces: tenant
admins keep `403` on every `/platform` route, and Phase 5 services keep
deriving `tenantId` exclusively from the session.

## 12 · Error handling

Mapped codes in use:
`TENANT_NOT_FOUND` (404) · `TENANT_SLUG_ALREADY_EXISTS` (409) ·
`TENANT_SLUG_RESERVED` (400) · `TENANT_ADMIN_ALREADY_EXISTS` (409) ·
`EMAIL_ALREADY_EXISTS` (409) · `INVALID_TENANT_STATUS` (400) ·
plus the standard `VALIDATION_ERROR`, `FORBIDDEN`, `UNAUTHORIZED`,
`RATE_LIMITED`, `INTERNAL_ERROR` envelopes. Mongo duplicate-key errors
(`11000`) are translated, never exposed.

## 12b · Phase 8 additions

The console gained a full tenant detail page (Overview/Website/Branding/
Admin/Packages/Settings), platform overview metrics, website + branding
editors, authenticated preview, and a server-authorized read-only view of
a tenant's packages. Lifecycle rules, slug rules, the one-admin invariant,
provisioning atomicity, and "no hard delete" are unchanged — see
`docs/platform-admin.md` and `docs/website-configuration.md`.

## 13 · Admin console (this phase's UI)

`/admin` — SSR-guarded platform console (wrong role → `/login` redirect;
the API remains the boundary): overview stats, tenant manager
(search/filter/sort/pagination/lifecycle/details/reset), the 3-step
provisioning wizard with one-time credential display, confirm-pattern
danger buttons. Desktop-first, responsive, keyboard-usable.

## 14 · Future extension points (not built)

Tenant details "Website/Branding" tabs (Phase 7/9 consume
`website_configs` directly) · packages tab (Phase 8 reads the same
`packageCount` pipeline stage) · tenant-scoped "open dashboard" flow
(server-authorized, Phase 8) · audit log (deferred per scope).
