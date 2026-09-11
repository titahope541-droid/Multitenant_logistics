# Authentication & Authorization

**IMPLEMENTED IN PHASE 3.** This document defines how identity works on the
platform: who can authenticate, how sessions work, and how the backend
decides what an authenticated user may do. The frontend is never consulted
for those decisions.

---

## 1 · Who can authenticate — and who cannot

| Actor          | Account? | Authenticates? | Notes                                        |
| -------------- | -------- | -------------- | -------------------------------------------- |
| Platform Admin | yes (exactly one in V1) | yes — `/api/v1/auth/*` | tenantId = null            |
| Tenant Admin   | yes (exactly one per tenant) | yes — `/api/v1/auth/*` | tenantId binding required |
| End Customer   | **NO**   | **NEVER**      | anonymous public tracking only               |

There is no CUSTOMER/STAFF/DRIVER/MANAGER/SUPER_ADMIN/OPERATOR role, and no
customer authentication surface anywhere — no register endpoint exists.

---

## 2 · The flows (locked, implemented exactly so)

### Login

```text
User → Login Form → POST /api/v1/auth/login
  → rate limit (10 attempts / IP / 10 min)
  → validate input (zod loginSchema)
  → find user by email
  → verify Argon2id hash  (unknown email → one dummy-hash verify, same cost)
  → verify user.status = ACTIVE
  → if TENANT_ADMIN: verify tenant exists and tenant.status = ACTIVE
  → create session (random 256-bit token; SHA-256 hash stored)
  → Set-Cookie: meridian_session (HTTP-only)
  → 200 { success: true, data: { user: SafeUser } }

Any credential failure → 401 { code: "INVALID_CREDENTIALS",
                               message: "Invalid email or password." }  ← always identical
```

### Authenticated request

```text
Request (cookie: meridian_session)
  → withHandler pipeline (rate limit → origin check → security headers last)
  → withAuth: read cookie → session lookup by token hash
       → load FRESH user → reject if user suspended  (403 ACCOUNT_SUSPENDED)
       → if TENANT_ADMIN: load tenant → reject suspended/archived
                           (403 TENANT_SUSPENDED / TENANT_ARCHIVED)
  → authorize(context, roles?) — role allow-list gate (403 FORBIDDEN)
  → controller receives AuthContext { user: SafeUser, sessionId }
```

---

## 3 · Passwords

| Decision                | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Algorithm               | **Argon2id** (memory-hard), via the `argon2` package         |
| Stored field            | `passwordHash` — `select: false`, never returned by queries  |
| Policy (V1)             | 10–128 chars, non-blank. No arbitrary complexity rules       |
| Hashing location        | `src/server/utils/password.ts` — the only hashing site       |
| Timing parity           | unknown email → dummy-hash verify before failing identically |

Plaintext passwords exist only inside the login/change-password request,
are never logged, never stored, never returned.

---

## 4 · Sessions

Server-side sessions in the MongoDB `sessions` collection — an
**infrastructure** collection (the six locked business collections are
unchanged). No Redis, no JWT, no tokens in browser-readable storage.

| Property        | Behavior                                                            |
| --------------- | ------------------------------------------------------------------- |
| Token           | random 256-bit, base64url — opaque bearer (not a JWT)               |
| At rest         | **SHA-256 hash only** (unique index) — a DB leak yields no live tokens |
| Lifetime        | 7 days absolute from creation (no sliding renewal in V1)            |
| Cleanup         | TTL index on `expiresAt` — MongoDB physically deletes dead sessions |
| Snapshot fields | userId / role / tenantId — **re-validated fresh per request**       |
| Invalidation    | logout destroys the session; password change destroys all OTHER sessions of the user and preserves the current one |

### Cookie configuration

| Attribute | Development            | Production            |
| --------- | ---------------------- | --------------------- |
| Name      | `meridian_session`     | `meridian_session`    |
| HttpOnly  | yes (JS cannot read it)| yes                   |
| Secure    | no (http://localhost)  | **yes (HTTPS only)**  |
| SameSite  | `Lax`                  | `Lax`                 |
| Path      | `/`                    | `/`                   |
| Expiry    | session expiry (7d)    | session expiry (7d)   |

---

## 5 · Endpoints (full contract: docs/api.md)

| Method & route                          | Auth | Behavior                                            |
| --------------------------------------- | ---- | --------------------------------------------------- |
| `POST /api/v1/auth/login`               | —    | issues session + cookie; hard rate limit            |
| `POST /api/v1/auth/logout`              | —    | destroys session, clears cookie; idempotent         |
| `GET /api/v1/auth/me`                   | any  | returns SafeUser; 401 without a valid session       |
| `POST /api/v1/auth/change-password`     | any  | verify current → policy → rehash → invalidate others |

---

## 6 · Enumeration & brute-force defenses

1. **One message for every login failure** — unknown email, wrong password,
   inactive user, suspended/archived tenant all return the identical
   `401 INVALID_CREDENTIALS / "Invalid email or password."`
   (the real reason is logged server-side only).
2. **Timing parity** — the dummy-hash verify makes unknown emails cost the
   same Argon2id work as real ones.
3. **Login rate limit** — 10 attempts/IP/10 minutes in addition to the
   global 120/min/IP limit; excess → `429 RATE_LIMITED`.
4. **Specific codes exist only AFTER authentication** —
   `ACCOUNT_SUSPENDED`, `TENANT_SUSPENDED`, `TENANT_ARCHIVED` can only be
   observed by someone already holding a valid session.

---

## 7 · Authorization model

> Authentication answers *who are you*; authorization answers *may you*.

* `authorize(auth, roles?)` — the gate (`src/server/middleware/auth.ts`).
  No session → `401 UNAUTHORIZED`. Role outside the allow-list →
  `403 FORBIDDEN`.
* `withAuth(handler, { roles })` wraps routes and composes the entire
  `withHandler` pipeline around them.
* Today it protects: `GET /auth/me`, `POST /auth/change-password` (any
  role), `/api/v1/admin/*` (`TENANT_ADMIN` only), `/api/v1/platform/*`
  (`PLATFORM_ADMIN` only). Phase 4/5/8/9 endpoints attach the identical gate.

### Platform Admin is privileged — not invisible

Platform Admin passes the same gates; there is no `if admin → skip checks`
bypass. Cross-tenant reads/writes will always flow through explicitly
authorized platform endpoints, and every mutation is logged.

### Tenant scope is session-authoritative

`AuthContext.user.tenantId` is the ONLY tenant identity the backend accepts.
Phase 5 services take `tenantId` from the context and inject it into every
query filter — a client-sent `tenantId` is ignored as plain untrusted input
(cf. `docs/security.md §1`, tests/authorization.test.ts).

---

## 8 · Tenant status restrictions (implemented)

| Tenant state | Public site/tracking | Tenant Admin login | Tenant Admin API | Platform Admin |
| ------------ | -------------------- | ------------------ | ---------------- | -------------- |
| ACTIVE       | works                | works              | works            | works          |
| SUSPENDED    | disabled (Phase 4/5 gate on same rule) | 401 generic | 403 TENANT_SUSPENDED | works |
| ARCHIVED     | disabled             | 401 generic        | 403 TENANT_ARCHIVED  | works (data retained) |

Enforcement point: `resolveSessionByToken` re-checks user + tenant status
on **every request**, so suspension takes effect immediately — not at next
login and not at session expiry.

---

## 9 · CSRF and CORS

**CSRF (all four layers active for state-changing requests):**

1. `SameSite=Lax` cookies — cross-site POSTs don't carry the session.
2. Origin allow-list on every non-GET (Phase 2 middleware) — requests with
   a foreign `Origin` get `403 FORBIDDEN`.
3. JSON-only bodies — `readJsonBody` rejects anything but
   `Content-Type: application/json`; simple HTML-form CSRF cannot send that.
4. Same-origin deployment — the UI and API are one origin, so no ambient
   cross-origin surface exists for credential flows.

**CORS:** the frontend is served by the same application; no credentialed
cross-origin access is offered to third parties and
`Access-Control-Allow-Origin: *` is never combined with credentials.

---

## 10 · Logging rules

Logged (no credentials, ever): login success, login failure reason
(category only), blocked logins (inactive user / suspended tenant),
logout, password change (+ count of invalidated sessions), rate-limit
hits, security rejections.

NEVER logged: passwords, password hashes, session tokens, raw cookies,
session secrets. The logger redaction list (`src/server/utils/logger.ts`)
covers `*.password`, `*.token`, `*.secret`, auth headers, cookies.

---

## 11 · Verification assets

* `tests/password.test.ts` — policy + Argon2id behavior (9 tests)
* `tests/auth.service.test.ts` — full login matrix, session lifecycle,
  password-change invalidation (17 tests)
* `tests/authorization.test.ts` — role gates + tenant-context authority (7 tests)
* `scripts/seed-platform-admin.ts` / `scripts/seed-demo-tenant.ts` —
  env-credential-only seeding (docs/development.md §seeding)
* `/login` — minimal browser verification page (not a dashboard)
