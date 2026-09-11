# Backend Architecture

The backend is a **separate tier with a hard boundary**, structured in the
classic Express style — routing, middleware, controllers, services, models —
running on the Node runtime of the application server.

---

## 1 · Tier layout (Phase 2 state)

```text
src/server/                ◀ the backend tier (server-only imports)
├── config/                environment loading + validation (env.ts — MONGODB_URI…)
├── http/                  errors.ts (ApiError + codes) · respond.ts (envelopes)
│                          with-handler.ts (request pipeline + error boundary)
├── middleware/            security.ts (headers · origin · rate limit) · auth.ts (withAuth/authorize)
├── controllers/           ◀ thin HTTP adapters (auth.controller.ts — Phase 3)
├── services/              ◀ business logic (health · auth; packages Phase 5)
├── validators/            ◀ zod request boundary (common + per-domain schemas)
├── realtime/              Socket.IO event contracts (server attaches Phase 6)
└── utils/                 logger (pino)

src/app/api/               ◀ thin HTTP surface = "routes"
src/db/                    ◀ Mongoose: connection (index.ts) + models/ + ensure-indexes
```

| Express concept | Implemented as                                             |
| --------------- | ---------------------------------------------------------- |
| Router          | `src/app/api/**/route.ts` files                            |
| Controller      | the handler body — thin, IO-shaping only                   |
| Middleware      | `withHandler` + `src/server/middleware/{security,auth}.ts` |
| Controllers     | `src/server/controllers/*` — thin adapters (Phase 3)      |
| Services        | `src/server/services/*` — framework-free functions         |
| Models          | `src/db/models/*` — six locked Mongoose collections        |
| Error middleware| `withHandler` pipeline stage 4                             |
| Validators      | `src/server/validators/*` — zod, invoked by controllers    |

---

## 2 · Request flow (implemented exactly this way)

```text
Request
   ▼
Route            src/app/api/.../route.ts      — URL surface, HTTP verbs
   ▼
withHandler      1 rate limit (per-IP window) · 2 origin check (non-GET)
   ▼
Controller       validate(schema, input) → call service → return ok(data)
   ▼
Service          src/server/services/...       — business rules
   ▼
Model            src/db/models/*               — schemas, validators, indexes
   ▼
MongoDB          source of truth
   ▲
withHandler      4 error shaping → standard envelope · 5 security headers (always)
```

Business logic lives in services, never in route files: unit-testable,
shared by multiple entrypoints (REST now, sockets later), and the single
place where tenant scoping will be enforced (Phase 4/5). Controllers only
translate HTTP ↔ domain.

---

## 3 · Application startup & MongoDB connection

`src/db/index.ts` — `connectToDatabase()`:

1. Reads `MONGODB_URI` via `src/server/config/env.ts` (validated lazily —
   missing URI throws a clear error, never a silent default).
2. Caches the connection on `globalThis` (dev hot-reload safety).
3. Connects with `serverSelectionTimeoutMS: 2500`, `bufferCommands: false`,
   `maxPoolSize: 10`, `autoIndex: false` (index builds are explicit).
4. Logs connection lifecycle through pino (connected/disconnected/error).
5. On failure: clears the pending promise (next request retries) and logs —
   the process does **not** silently pretend MongoDB exists; `/api/health`
   reports `database: "down"` and `/api/ready` fails with `503 NOT_READY`.
6. **Index ensuring:** in development, `ensureAllIndexes()` runs once after
   connect (`createIndexes()` per model); in production the same function is
   a deployment step (Phase 12), never implicit boot work.
7. **Graceful shutdown:** SIGINT/SIGTERM → `mongoose.disconnect()` → exit.

---

## 4 · Mongoose models (IMPLEMENTED IN PHASE 2)

`src/db/models/` — exactly the six locked collections
(`docs/database.md` has the full field/index contract):

| Model            | Collection        | Model-layer guarantees                                   |
| ---------------- | ----------------- | -------------------------------------------------------- |
| TenantModel      | tenants           | unique slug · status enum · identity only                |
| UserModel        | users             | unique email · role↔tenantId rule · 1-platform-admin and 1-tenant-admin-per-tenant partial uniques · passwordHash select:false |
| PackageModel     | packages          | global unique trackingId · five-status enum · embedded sender/receiver · free-text paymentMethod |
| StatusEventModel | status_events     | append-only (createdAt-only timestamps) · tenantId       |
| LocationHistoryModel | location_history | append-only · lat/lng ranges · tenantId                |
| WebsiteConfigModel | website_configs  | unique tenantId · branding/sections validation caps      |

Design rules honoured: schemas hold *data invariants* (required, enums,
ranges, formats, indexes, the user cardinality uniques) — business
*workflows* live in services. Embedded subdocuments use no independent
`_id`. Registration is hot-reload safe (`models.X ?? model(...)`), and the
registry (`src/db/models/index.ts`) is the single enumeration of what
exists. **There is no Customer model.**

---

## 5 · Validators (zod — chosen foundation)

**Why zod:** TypeScript-first inference (schema = input type, one source);
`safeParse` composes exactly with our `ApiError` envelope; `.strict()`
rejects unknown keys (no field smuggling, incl. `$`-operator keys — see
`docs/security.md §6`); zero overhead at runtime beyond the parse.

**Where used:** controllers, AFTER auth/tenancy middleware (from Phase 3),
BEFORE any service call. Live today: the public tracking stub validates its
`trackingId` param (`400 VALIDATION_ERROR` on garbage). Authored for the
next phases: `createTenantSchema`, `createUserSchema` (role↔tenantId
refinement), `createPackageSchema` / `updatePackageSchema` /
`changePackageStatusSchema`, `upsertWebsiteConfigSchema`.

**How future developers use it:** never read `request.json()` into a cast;
always `const input = validate(createPackageSchema, await request.json())`
inside a controller wrapped by `withHandler`. Server-owned fields
(`trackingId`, `status`, `archived`, `tenantId`) are deliberately absent
from create schemas — the server assigns/resolves them.

---

## 6 · Middleware & security foundation

Implemented in Phase 2 (`src/server/middleware/security.ts`, applied in
`withHandler`): security headers on every API response (Helmet-equivalent
set); Origin allow-list check for non-GET (platform domain + subdomains +
app origin + localhost-in-dev); per-IP sliding-window rate limit
(120/min baseline).

Prepared, not implemented: cookie sessions + CSRF tokens (Phase 3);
shared/distributed rate-limit store (Phase 10 — the in-process Map is a
single-instance baseline). Auth and tenant-context middleware attach inside
`withHandler`'s pipeline where marked; controllers from Phase 3 receive a
typed request context.

---

## 7 · Error handling

Centralized in `withHandler`: thrown `ApiError`s render their status and
the standard envelope; unknown throws become `500 INTERNAL_ERROR` and are
pino-logged with detail (never leaked to the client). Codes registry
(`src/server/http/errors.ts`) gained Phase 2 entries: `VALIDATION_ERROR`,
`RATE_LIMITED`, `NOT_READY`, live origin-based `FORBIDDEN`. Mirrors
`docs/api.md §4`.

---

## 8 · Route organization

```text
/api/health                        implemented — liveness (200 always, DB-aware)
/api/ready                         implemented — readiness (500-class failure when DB down)
/api/v1/public/track/[trackingId]  stub — validates param, then 501 (Phase 5 replaces)
/api/v1/auth/[...path]             group stub — every method 501 (Phase 3)
/api/v1/admin/[...path]            group stub — every method 501 (Phase 5/8)
/api/v1/platform/[...path]         group stub — every method 501 (Phase 4/9)
```

---

## 9 · Health, readiness, and public safety

Liveness (`/api/health`) answers 200 whenever the process can respond,
embedding the MongoDB probe result. Readiness (`/api/ready`) answers 200
only when MongoDB is reachable, else `503 NOT_READY`. Neither leaks
connection strings, credentials, versions of the driver, or stack traces —
payloads are the documented minimal report only.

---

## 10 · Realtime (Socket.IO) — unchanged foundation

Contracts remain pinned in `src/server/realtime/events.ts`
(`tracking:status.updated`, `tracking:location.updated`; rooms
`tenant:{id}` / `tracking:{trackingId}`). The Phase 5 status service will
emit events matching these payloads; Phase 6 attaches the server and
re-broadcasts. Broadcast-only; writes stay on the HTTP API.

---

## 11 · Logging

pino — structured JSON in production, pretty in dev, `LOG_LEVEL` env,
module-scoped children, secret/auth material redacted. DB connection, HTTP
errors, auth events (categories only — never credentials), and security
rejections (`rate_limit`, `origin_not_allowed`) are each logged with
structured context.

---

## 12 · Authentication tier (IMPLEMENTED Phase 3)

Full contract: `docs/authentication.md`. Where things live:

| Concern                | Location                                                        |
| ---------------------- | --------------------------------------------------------------- |
| Login/logout/me/password logic | `src/server/services/auth.service.ts`                    |
| HTTP adapters + cookies | `src/server/controllers/auth.controller.ts`                    |
| Session record         | `src/db/models/session.model.ts` (MongoDB store, TTL index)     |
| Token util             | `src/server/utils/session-token.ts` (random 256-bit + SHA-256)  |
| Password util          | `src/server/utils/password.ts` (Argon2id + policy + dummy hash) |
| Guards                 | `src/server/middleware/auth.ts` (`withAuth`, `authorize`)       |
| Routes                 | `src/app/api/v1/auth/{login,logout,me,change-password}`         |

Session flavour: server-side MongoDB sessions with opaque bearer tokens
(SHA-256 hashed at rest) behind an HTTP-only cookie — the locked choice;
no JWT, no localStorage, no Redis, no third-party auth provider.
Route-guard composition: `withAuth` wraps `withHandler`, so the whole
pipeline (rate limit → origin → error shaping → headers) also protects
authenticated routes.
