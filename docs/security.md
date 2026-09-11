# Security Architecture

The practical security reference for every phase. Authentication and
authorization are IMPLEMENTED (Phase 3); hardening items carry their owning
phase. One principle governs everything:

> **The frontend is not a security boundary.**
> The backend — and only the backend — enforces authorization.

---

## 1 · Server-side tenant isolation

* `tenantId` is resolved **server-side** — tenant admins: from the validated
  session (`AuthContext.user.tenantId`); public traffic: from the host
  (Phase 4) — and injected into every query by the service layer.
* Client-supplied tenant identifiers are untrusted input: ignored or
  cross-checked, never authoritative (covered by tests/authorization.test.ts).
* Rule of review: any service reading tenant-owned data takes `tenantId`
  as an explicit parameter sourced from the auth context.
* **Enforced (Phase 5):** every package query — list, details, status,
  location, archive — carries `{ tenantId }` from the resolved auth
  context, so cross-tenant requests are *invisible* (`404`), never `403`;
  existence of foreign packages is not even confirmable. Verified by the
  mandatory cross-tenant matrix in `tests/package.service.test.ts`.

## 2 · Authentication — IMPLEMENTED

* Roles: exactly `PLATFORM_ADMIN` and `TENANT_ADMIN`. No customer auth, no
  registration endpoint, no other roles.
* Server-side sessions in MongoDB (`sessions` infrastructure collection);
  opaque 256-bit bearer tokens; SHA-256 hashes at rest; 7-day absolute
  lifetime; TTL-indexed deletion.
* Login requires: user exists → Argon2id verify → user ACTIVE → (tenant
  admin) tenant ACTIVE. Implemented in `src/server/services/auth.service.ts`;
  full contract in `docs/authentication.md`.

## 3 · Authorization — IMPLEMENTED

* `authorize()` + `withAuth(handler, { roles })` in `src/server/middleware/auth.ts`.
* Live enforcement points: `/api/v1/admin/*` (TENANT_ADMIN only),
  `/api/v1/platform/*` (PLATFORM_ADMIN only — including the Phase 4 tenant
  management endpoints), plus `me`/`change-password`.
* Platform Admin passes the same gates — no `if admin → skip` bypass;
  platform mutations are logged with tenantId + action.
* User status and tenant status are re-validated on every request AND
  lifecycle transitions pro-actively destroy the affected tenant's sessions:
  suspension/archival takes effect immediately.

### Website-configuration authorization (Phase 8)

* Website/branding endpoints exist ONLY under `/api/v1/platform/*` behind
  the `PLATFORM_ADMIN` gate. There is deliberately no
  `/api/v1/admin/website*` route — a Tenant Admin has no mutation path to
  presentation at all (test-verified).
* Configuration is data, not code: text fields reject markup, colors must
  be `#hex`, images/social links must be http(s) URLs, icons and section
  keys come from fixed vocabularies, `.strict()` rejects unknown keys.
  Nothing from configuration is ever executed server-side.
* Preview renders behind the same PLATFORM_ADMIN page guard — it is not a
  public URL and it does not bypass tenant lifecycle for public hosts.
* Platform reads of tenant packages are explicit, tenant-scoped, and
  read-only — privilege without impersonation.

### Tenant-administration security rules (Phase 4)

* Only `PLATFORM_ADMIN` reaches `/api/v1/platform/tenants*` — a
  TENANT_ADMIN receives `403 FORBIDDEN` before any handler logic.
* Temporary passwords (provisioning / resets) are generated server-side,
  shown once, Argon2id-hashed at rest, never logged, never retrievable.
* Password reset invalidates all sessions of the affected admin; the old
  password is dead from that moment.
* Suspended/archived tenant admins: login → generic `401` (no
  enumeration); authenticated surface → `403 TENANT_SUSPENDED/ARCHIVED`.

## 4 · Password hashing — IMPLEMENTED

* **Argon2id** (memory-hard). Hashing lives only in
  `src/server/utils/password.ts`.
* `passwordHash` is `select: false` on the User model and never appears in
  any response (the safe projection is enumerated: id, name, email, role,
  tenantId — test-verified).
* Policy: 10–128 chars, non-blank (docs/authentication.md §3).
* Timing parity: unknown emails still pay one dummy-hash verification.

## 5 · Session & cookie security — IMPLEMENTED

| Control             | State                                                              |
| ------------------- | ------------------------------------------------------------------ |
| HttpOnly            | always — JavaScript cannot read the cookie                          |
| Secure              | production only (HTTPS); localhost dev on plain http is allowed     |
| SameSite            | `Lax` — cross-site POSTs don't carry sessions                       |
| Token storage       | never localStorage/sessionStorage/URL — no JS-readable tokens exist |
| Session at rest     | SHA-256 hash — DB leak yields no usable tokens                      |
| Logout              | destroys the server-side session, idempotent                        |
| Password change     | rehashes, kills every OTHER session, keeps the current one          |
| Expiry              | 7-day absolute; TTL index cleanup                                   |

## 6 · Input validation — IMPLEMENTED

* zod boundary (`src/server/validators`) inside controllers, AFTER auth,
  BEFORE services. `.strict()` rejects unknown keys — including
  `$`-prefixed operator-smuggling keys.
* `readJsonBody` converts malformed/wrong-content-type bodies into clean
  `400 VALIDATION_ERROR` — and structurally blocks form-encoded CSRF.
* No client-supplied `tenantId` or server-owned fields in create schemas.

## 7 · Transport protections

| Control            | Rule                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| CORS               | same-origin deployment; credentialed cross-origin access is not offered; `*` is never combined with credentials |
| CSRF               | four layers: SameSite=Lax · Origin allow-list on non-GET · JSON-only bodies · same-origin deployment (docs/authentication.md §9) |
| Security headers   | Phase-2 set on every API response (nosniff, DENY framing, referrer/permissions policy, restrictive CSP, no-store) |
| Secrets            | env-only; server-only modules; `NEXT_PUBLIC_` = public by definition |

## 8 · Safe API responses & public data (Phase 6)

* Public tracking is **unauthenticated** — therefore it answers only an
  explicit allowlist (`docs/public-tracking.md §3`), hostname-resolved,
  rate-limited (30/min/IP), never raw documents, never location history,
  never contact/payment/cost fields, never ids/tenantId.
* Unknown tracking IDs, archived packages, and foreign-tenant IDs share
  ONE indistinguishable 404; suspended/archived tenants cannot expose any
  tracking data; unknown hosts never fall back to another tenant.
* Phase-11 hardening live: HSTS on production API responses, a 1 MB JSON
  body ceiling on mutating endpoints, and a release gate that requires
  the full 156-test suite (docs/testing.md §8) before any deploy.
* Admin endpoints return only their documented projections — never
  passwordHash, session data, or server internals.
* Errors are the standard envelope; full detail stays in server logs.
* Public website render data is projected server-side
  (`PublicWebsiteData`) — database ids and internal fields excluded.
* Auth endpoints return only the enumerated SafeUser fields — never
  passwordHash, session records, or server internals.

### Sharing & deep-link security (Phase 9)

* Track deep links validate `?trackingId=` with the tracker regex and
  load it through the normal endpoint — query strings never reach markup
  or database queries directly.
* Share content is allowlist-only (company, tracking ID, public URL);
  WhatsApp sharing is a plain encoded wa.me link — no API, no webhooks,
  no credentials, no automatic messaging of any kind.
* Tracking links point at tenant hostnames; tenant identity is still
  resolved server-side on arrival — a URL never grants authority.

## 9 · Account-enumeration & brute-force defenses — IMPLEMENTED

* One identical `401 INVALID_CREDENTIALS / "Invalid email or password."`
  for every login failure category (unknown email, wrong password,
  inactive user, suspended/archived tenant).
* Status-specific codes (`ACCOUNT_SUSPENDED`, `TENANT_*`) exist only
  **after** authentication — at the `/auth/me` and guarded-route level.
* Login: 10 attempts/IP/10 min; global: 120 requests/IP/min → `429 RATE_LIMITED`.
* Phase 10: shared/distributed rate-limit store (current Map is per-process).

## 10 · Socket.IO authorization — IMPLEMENTED (Phase 7)

* Same origin allow-list at handshake; the same session cookie optionally
  upgrades a socket to its owner's identity (public otherwise).
* Join authorization mirrors the public tracking checks exactly: tenant
  host-resolved and ACTIVE, package exists under THAT tenant, not
  archived, tracking ID well-formed. Rooms are server-created per
  authorization — clients never declare rooms; there is no `all-packages`.
* Public rooms key by trackingId — knowing a MongoDB `_id` grants nothing
  (test-proven).
* Broadcast-only protocol: sockets carry no write operations; all writes
  stay on authenticated HTTP endpoints.
* Realtime payloads follow the REST allowlist verbatim — the tracking
  room receives no tenantId, no contact data, no internals (test-proven
  via payload serialization); the admin tenant room adds `tenantId`.
* Events emit only after the database commits — a failed write emits
  nothing (test-proven), so stale/fake updates cannot ride the wire.
* Geocoding mediator endpoints: role-gated and rate-limited
  (20 req/IP/min) so provider quotas can't be abused through us.

## 11 · Database is never exposed to the browser

No connection strings in client bundles, no direct DB access from UI code,
no Mongoose imports outside `src/server` / `src/db`. The browser only ever
sees `/api/v1` envelopes.

## 12 · Logging restrictions — enforced

Never logged: passwords, hashes, session tokens, raw cookies, secrets
(logger redaction: `*.password`, `*.token`, `*.secret`, auth headers,
cookies). Logged: auth event categories, guard rejections, rate-limit
hits, connection lifecycle. Full event list: `docs/authentication.md §10`.
