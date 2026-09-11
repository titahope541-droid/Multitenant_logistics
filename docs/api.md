# API Architecture

Base path: **`/api/v1`**. Versioned from day one so contracts can evolve
without breaking deployed clients.

---

## 1 · Endpoint groups

| Group       | Audience       | Auth | State                                                  |
| ----------- | -------------- | ---- | ------------------------------------------------------- |
| `/auth`     | both admins    | —    | **IMPLEMENTED (Phase 3):** login · logout · me · change-password |
| `/public`   | end customers  | no   | **IMPLEMENTED (Phase 6):** public tracking — see §2d |
| `/admin`    | tenant admins  | yes  | **IMPLEMENTED (Phase 5):** package management — see §2c |
| `/platform` | platform admin | yes  | **IMPLEMENTED (Phase 4):** tenant management — see §2b |

---

## 2 · Implemented endpoints — authentication (Phase 3)

All auth endpoints sit behind the standard pipeline (rate limit, origin
check, security headers). Responses carry no credential material ever.

### `POST /api/v1/auth/login`

Authenticates a user and creates a server-side session.

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| Auth required   | no                                                              |
| Rate limit      | 10 attempts / IP / 10 min (in addition to the global limit)     |
| Body            | `{ "email": "ops@swift.example.com", "password": "…" }`         |
| Success `200`   | `{ "success": true, "message": "Login successful.", "data": { "user": { "id", "name", "email", "role", "tenantId" } } }` + `Set-Cookie: meridian_session` (HttpOnly, SameSite=Lax, Secure in prod, 7-day expiry) |
| Errors          | `400 VALIDATION_ERROR` (malformed body/fields) · `401 INVALID_CREDENTIALS` — **identical generic message for unknown email, wrong password, inactive user, suspended/archived tenant** · `403 FORBIDDEN` (foreign Origin) · `429 RATE_LIMITED` |

### `POST /api/v1/auth/logout`

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| Auth required   | no (idempotent)                                                 |
| Behavior        | destroys the server-side session if resolvable; clears cookie   |
| Success `200`   | `{ "success": true, "message": "Logged out.", "data": {} }`     |

### `GET /api/v1/auth/me`

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| Auth required   | any role                                                        |
| Success `200`   | `{ "success": true, "data": { "user": { …SafeUser } } }`        |
| Errors          | `401 UNAUTHORIZED` (no/expired/invalid session) · `403 ACCOUNT_SUSPENDED` · `403 TENANT_SUSPENDED` · `403 TENANT_ARCHIVED` |

Session validity — including user status and (for tenant admins) tenant
status — is re-checked fresh on **every** request.

### `POST /api/v1/auth/change-password`

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| Auth required   | any role                                                        |
| Body            | `{ "currentPassword": "…", "newPassword": "…" }`                |
| Behavior        | verifies current → policy (10–128, non-blank) → Argon2id rehash → **invalidates every OTHER session**, keeps the current one |
| Success `200`   | `{ "success": true, "message": "Password updated. Other sessions have been signed out." }` |
| Errors          | `400 VALIDATION_ERROR` · `401 UNAUTHORIZED` · `401 INVALID_CREDENTIALS` ("Current password is incorrect.") |

### Unknown auth endpoints — catch-all

Anything else under `/api/v1/auth/*` → `404 NOT_FOUND` in the standard
envelope (never an unstyled HTML 404).

---

## 2b · Implemented endpoints — platform tenant management (Phase 4)

All guarded by `PLATFORM_ADMIN` (anonymous → `401`, wrong role → `403`).
Tenant-context notes and lifecycle invariants: `docs/tenant-management.md`.

### `GET /api/v1/platform/tenants`

Query params: `search` (company/slug/admin name/admin email) ·
`status` = `ALL|ACTIVE|SUSPENDED|ARCHIVED` (default `ALL` = ACTIVE+SUSPENDED) ·
`sort` = `newest|oldest|most_packages|company_name` (default `newest`) ·
`page` ≥ 1 · `limit` 1–50 (default 20, clamped).

Success `200`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "…", "companyName": "Swift Logistics", "slug": "swift",
        "status": "ACTIVE",
        "admin": { "id": "…", "name": "Adaeze Okafor", "email": "adaeze@swift.com" },
        "packageCount": 12, "createdAt": "…", "updatedAt": "…"
      }
    ],
    "page": 1, "limit": 20, "total": 37, "totalPages": 2
  }
}
```

### `POST /api/v1/platform/tenants` — atomic provisioning

Body:

```json
{
  "companyName": "Swift Logistics",
  "slug": "swift",
  "contact": { "phone": "+234 …", "email": "ops@swift.com", "address": "…" },
  "admin": { "name": "Adaeze Okafor", "email": "adaeze@swift.com", "password": "optional-omit-to-generate" }
}
```

Creates tenant + exactly one TENANT_ADMIN + initialized WebsiteConfig in a
MongoDB transaction (sequential-with-rollback fallback on standalone
mongod). Success `201`: `{ tenant, admin, temporaryPassword? }` —
`temporaryPassword` is present only when server-generated and is never
retrievable again. Errors: `400 VALIDATION_ERROR` · `400 TENANT_SLUG_RESERVED`
· `409 TENANT_SLUG_ALREADY_EXISTS` · `409 EMAIL_ALREADY_EXISTS` ·
`409 TENANT_ADMIN_ALREADY_EXISTS`.

### `GET /api/v1/platform/tenants/:tenantId`

Success `200`: `{ tenant: {…identity, contact, timestamps}, admin: {…, status, createdAt} | null, packageCount, websiteConfigured }`.
Errors: `400 VALIDATION_ERROR` (bad id) · `404 TENANT_NOT_FOUND`.

### `PATCH /api/v1/platform/tenants/:tenantId`

Body (all optional, strict): `{ "companyName"?, "slug"?, "contact"? }` —
status changes go through lifecycle endpoints only. Success `200` with the
refreshed details. Errors: as above (`TENANT_SLUG_*` on conflict).

### Lifecycle actions (POST)

`/:tenantId/suspend` · `/:tenantId/archive` · `/:tenantId/restore`

Allowed matrix: `suspend: ACTIVE→SUSPENDED` · `archive: ACTIVE→ARCHIVED` ·
`restore: SUSPENDED|ARCHIVED→ACTIVE`. Suspension/archival also destroy the
tenant's live admin sessions. Success `200` with refreshed details +
message. Errors: `400 INVALID_TENANT_STATUS` (allowed set named) ·
`404 TENANT_NOT_FOUND`.

### `GET /api/v1/platform/stats` — overview metrics (Phase 8)

Success `200`: `{ tenants: { total, active, suspended, archived }, packages: { total, activeShipments, delivered } }`.
`activeShipments` = non-DELIVERED, non-archived packages across the platform.

### `GET|PATCH /api/v1/platform/tenants/:tenantId/website` (Phase 8)

`GET` → the full editable configuration (same shape the public renderer
consumes): branding, navigation, sections (hero/services/about/features/
tracking/contact/footer), `sectionOrder`, contact, socialLinks, seo.
Self-heals: a tenant without a config row gets one initialized.

`PATCH` body = partial draft, `.strict()`; deep-merged per section so a
partial save never clobbers other sections; publishes immediately.
Errors: `400 VALIDATION_ERROR` (markup in text, bad hex/URL/icon, unknown
key, duplicate/unknown section, oversized list) · `404 TENANT_NOT_FOUND`
· `401/403` for anyone who is not a PLATFORM_ADMIN.

### `GET|PATCH /api/v1/platform/tenants/:tenantId/branding` (Phase 8)

Focused branding read/save → `{ branding: { …palette, typography, buttonStyle, borderRadius, theme, logoUrl, faviconUrl, tagline } }`.
Same validation and authorization rules.

### `GET /api/v1/platform/tenants/:tenantId/packages` (Phase 8)

Server-authorized Platform-Admin READ of one tenant's packages (the "open
tenant dashboard" data path — no impersonation, no session swap, no
mutations). Paginated `{ items, page, limit, total, totalPages }` where an
item is `{ id, trackingId, packageName, status, receiverName, currentLocationName, createdAt }`.

### `POST /api/v1/platform/tenants/:tenantId/admin/reset-password`

Generates a new temporary password, rehashes, invalidates the admin's
sessions. Success `200`: `{ admin: {…}, temporaryPassword }` (shown **once**).
Errors: `404 TENANT_NOT_FOUND` · `404 NOT_FOUND` (tenant has no admin).

---

## 2c · Implemented endpoints — tenant-admin packages (Phase 5)

All guarded by `TENANT_ADMIN` with an ACTIVE tenant; every query is scoped
by the session's tenantId — cross-tenant access answers `404 PACKAGE_NOT_FOUND`
(not `403`: other tenants' packages are invisible by design). These are
ADMIN payloads — never reused for public tracking.

### `GET /api/v1/admin/packages`

Query: `search` (trackingId/packageName/receiver/sender) · `status` =
`ALL|PENDING|PROCESSED|IN_TRANSIT|ARRIVED_AT_FACILITY|DELIVERED` ·
`archived=true` → archive drawer (default excludes archived) ·
`page` · `limit` ≤ 50. Success `200`:

```json
{ "success": true, "data": { "items": [{ "id", "trackingId", "packageName", "status", "archived", "senderName", "receiverName", "currentLocationName", "createdAt", "updatedAt" }], "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

### `POST /api/v1/admin/packages`

Body: `{ packageName*, description?, sender* {name,phone,email?,address}, receiver* {…}, specifications? {size?, weight?}, payment? {paymentMethod? FREE TEXT, paymentStatus?, shippingCost?}, delivery? {estimatedDeliveryDate?}, currentLocation? {latitude, longitude, locationName?} }`.
Server mints the tracking ID (`PKG-{TENANT3}-{YYYYMMDD}-{RANDOM6}`), writes
package + initial `PENDING` status event (+ first location row if
coordinates given) atomically. Success `201`: `{ package: AdminPackageDetails, trackingId }`.
Errors: `400 VALIDATION_ERROR` · `500 TRACKING_ID_GENERATION_FAILED`.

### `GET /api/v1/admin/packages/:packageId`

Success `200`: full admin projection + `statusHistory` (ascending) +
`locationHistory` (≤100 newest). Errors: `400 VALIDATION_ERROR` (bad id) ·
`404 PACKAGE_NOT_FOUND`.

### `PATCH /api/v1/admin/packages/:packageId/status`

Body `{ "status": one of the exact five, "note"?: string }`. Sequence is
not restricted (admin override); change + event are atomic. Errors:
`400 VALIDATION_ERROR` · `400 INVALID_PACKAGE_STATUS` · `400 PACKAGE_ARCHIVED`
· `404 PACKAGE_NOT_FOUND`.

### `PATCH /api/v1/admin/packages/:packageId/location`

Body `{ "latitude": -90…90, "longitude": -180…180, "locationName"? }`.
currentLocation update + history append are atomic. Errors:
`400 INVALID_LOCATION` · `400 PACKAGE_ARCHIVED` · `404 PACKAGE_NOT_FOUND`.

### `POST /api/v1/admin/packages/:packageId/archive` · `/restore`

Soft-delete flag only — data and histories retained; restore preserves
tracking ID and history. Archived packages reject status/location
mutations until restored.

### Geocoding (backend-mediated, Phase 7)

Both `TENANT_ADMIN`-gated, rate-limited 20 requests/IP/minute (in addition
to global), normalized `GeocodingResult` payloads only.

`GET /api/v1/admin/geocoding/search?q=Bamenda` →
`{ "results": [{ "id", "displayName", "latitude", "longitude" }] }`.
Errors: `400 VALIDATION_ERROR` (q < 2 or > 200 chars) ·
`429 RATE_LIMITED` · `502 UPSTREAM_UNAVAILABLE` (provider down).

`GET /api/v1/admin/geocoding/reverse?lat=5.96&lng=10.16` →
`{ "result": { … } | null }` — `null` means "no resolved name", never an
error; coordinates remain valid. Errors: as above + coordinate range.

### Realtime transport

Socket.IO shares the HTTP server at `/socket.io` — protocol, rooms,
authorization, and payloads live in `docs/realtime.md` (not a REST
surface). Status/location mutations above emit their broadcasts AFTER
their database commits.

---

## 3 · Implemented endpoints — infrastructure

### `GET /api/health` — liveness **(Phase 1)**

Always `200` when the process can answer; `data.checks.database` carries
the MongoDB probe (`up`/`down` + latency). Error surface: `RATE_LIMITED`.

### `GET /api/ready` — readiness **(Phase 2)**

`200` + report when MongoDB is reachable, else `503` with
`{ "code": "NOT_READY" }`. Route production traffic on this probe.

### `GET /api/v1/public/track/:trackingId` — **IMPLEMENTED (Phase 6)**

Unauthenticated; hostname resolves the tenant (never a client tenantId).
Rate limit: 30 requests/IP/minute plus the global limit.

Success `200` — the STRICT allowlist (docs/public-tracking.md §3):

```json
{
  "success": true,
  "data": {
    "trackingId": "PKG-SWI-20260909-K7Q2X9",
    "packageName": "Documents — Lagos to Abuja",
    "senderName": "Ada",
    "receiverName": "Femi",
    "estimatedDelivery": "2026-10-01T00:00:00.000Z",
    "status": "IN_TRANSIT",
    "lastUpdated": "2026-09-09T12:00:00.000Z",
    "currentLocation": { "latitude": 7.37, "longitude": 3.94, "locationName": "Ibadan waypoint", "updatedAt": "…" },
    "timeline": [
      { "status": "PENDING", "occurredAt": "…" },
      { "status": "IN_TRANSIT", "note": "left Lagos", "occurredAt": "…" }
    ]
  }
}
```

Never included: phones, emails, addresses, payment metadata, costs,
MongoDB ids, `tenantId`, location history, authentication material.

Errors: `400 VALIDATION_ERROR` (malformed id) · `403 TENANT_SUSPENDED` /
`403 TENANT_ARCHIVED` (tracking disabled, non-revealing message) ·
`404 TENANT_NOT_FOUND` (unknown website) · `404 PACKAGE_NOT_FOUND`
(identical for unknown id, archived package, and foreign-tenant id) ·
`429 RATE_LIMITED`.

### Deep links (Phase 9)

`GET /track?trackingId={id}` on a tenant host — a PAGE deep link, not an
API change: the value is validated against the tracker regex and loaded
through the same endpoint above. It's how shared tracking links work.

### Group stubs — `admin` / `platform` **(Phase 2/3)**

Unmatched paths under `/api/v1/admin/*` and `/api/v1/platform/*` still
answer `501 NOT_IMPLEMENTED` after their role gates (implemented routes
live above; unknown sub-paths keep the standard envelope).

---

## 4 · Standard response envelopes

Success: `{ "success": true, "message"?: "…", "data": … }`

Failure — everywhere, no exceptions:

```json
{ "success": false, "error": { "code": "PACKAGE_NOT_FOUND", "message": "Package could not be found." } }
```

Browser mirror: `ApiSuccess<T>` / `ApiFailure` in `src/types/api.ts`;
thrown as `ApiClientError` by `src/services/api-client.ts`.

---

## 5 · Error code registry

| Code                 | HTTP | Meaning                                        | Since / state    |
| -------------------- | ---- | ---------------------------------------------- | ---------------- |
| `INTERNAL_ERROR`     | 500  | unexpected server failure (logged)             | Phase 1 · live   |
| `NOT_IMPLEMENTED`    | 501  | contract stub for a planned endpoint           | Phase 1 · live   |
| `VALIDATION_ERROR`   | 400  | input failed the zod boundary                  | Phase 2 · live   |
| `RATE_LIMITED`       | 429  | sliding-window limit exceeded                  | Phase 2 · live   |
| `NOT_READY`          | 503  | readiness failed — MongoDB unreachable         | Phase 2 · live   |
| `UPSTREAM_UNAVAILABLE` | 502 | provider (geocoding) temporarily unavailable   | Phase 7 · live   |
| `FORBIDDEN`          | 403  | disallowed Origin or insufficient role         | Phase 2/3 · live |
| `PACKAGE_ARCHIVED`   | 400  | mutation attempted on an archived package      | Phase 5 · live   |
| `INVALID_PACKAGE_STATUS` | 400 | not one of the exact five statuses          | Phase 5 · live   |
| `INVALID_LOCATION`   | 400  | coordinates outside valid ranges               | Phase 5 · live   |
| `TRACKING_ID_GENERATION_FAILED` | 500 | could not allocate a unique tracking ID | Phase 5 · live   |
| `PACKAGE_NOT_FOUND`  | 404  | package unknown — incl. cross-tenant (invisible by design) | Phase 5 · live |
| `UNAUTHORIZED`       | 401  | missing/expired/invalid session                | Phase 3 · live   |
| `INVALID_CREDENTIALS`| 401  | generic login failure (enumeration-safe)       | Phase 3 · live   |
| `ACCOUNT_SUSPENDED`  | 403  | authenticated user was suspended               | Phase 3 · live   |
| `TENANT_SUSPENDED`   | 403  | tenant suspended (tenant-admin surface)        | Phase 3 · live   |
| `TENANT_ARCHIVED`    | 403  | tenant archived (tenant-admin surface)         | Phase 3 · live   |
| `NOT_FOUND`          | 404  | unknown endpoint / missing resource            | Phase 3 · live   |

---

## 6 · Request pipeline (every API route)

```text
withHandler
  1 rate limit        per-IP sliding window (global 120/min; login 10/10min)
  2 origin check      non-GET must come from an allowed origin — 403 FORBIDDEN
  3 controller        readJsonBody → validate(schema, input) → service → ok(data)
  4 error shaping     ApiError → its envelope; unknown → 500 INTERNAL_ERROR
  5 security headers  X-Content-Type-Options, X-Frame-Options, CSP, … — always

withAuth (authenticated routes) composes inside this pipeline and adds:
  cookie → session (hash lookup) → fresh user + tenant status gates → role gate
```

## 7 · Conventions

JSON in/out · `Content-Type: application/json` required for bodies · nouns
plural, kebab-case · ids in path params · no stack traces in payloads · no
client-supplied `tenantId` honored (server resolves tenancy from session or
host).
