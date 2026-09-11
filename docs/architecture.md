# Architecture

The single source of truth for **how the platform is structured and why**.
Read this before writing any code in any phase.

---

## 1 · System architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                             │
│  Tenant websites · public tracking · tenant admin · platform admin   │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ HTTPS + JSON only
                                 │ (browser NEVER touches the database)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  APPLICATION SERVER — Next.js runtime                                 │
│                                                                      │
│  ┌─────────────────────────────┐   ┌───────────────────────────────┐ │
│  │ UI tier (src/app,           │   │ API tier (src/server)          │ │
│  │ src/components)             │   │ route → middleware →           │ │
│  │                             │   │ controller → service → db      │ │
│  │ talks to the API ONLY via   │──▶│ business logic lives in        │ │
│  │ src/services                │   │ services/ — never in routes    │ │
│  └─────────────────────────────┘   └───────────────┬───────────────┘ │
└────────────────────────────────────────────────────│─────────────────┘
                                                      │ Mongoose (ODM)
                                                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DATABASE — MongoDB (one shared database, strict tenant isolation)   │
│  source of truth · tenantId on every tenant-owned document           │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  REALTIME TIER — Socket.IO (implemented, Phase 7)                     │
│  shares the SAME Node HTTP server as Next (server.ts, /socket.io)     │
│  rooms authorized server-side · broadcast-only · DB-first emissions  │
└──────────────────────────────────────────────────────────────────────┘
```

### Layer responsibilities

| Layer            | Responsibility                                                          | Must NOT do                                        |
| ---------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| Browser / UI     | Render, collect input, display tracking data                            | Talk to the DB, hold secrets, enforce security     |
| API tier         | AuthN/Z, tenant resolution, validation, business logic, response shaping | Render HTML, contain JSX                           |
| Database         | Durable storage, constraints, indexes                                   | Contain business rules beyond integrity            |
| Realtime tier    | Push live tracking updates to subscribed clients                        | Accept writes (writes stay on the HTTP API)        |

---

## 2 · Multi-tenant architecture

### What a tenant is

A **tenant = one logistics company** using the platform. Every tenant gets a
branded public website, public tracking, and an admin dashboard — served by
the same application and the same database as every other tenant.

### Tenant identification (concept — full resolution in Phase 4)

```text
swift.yourplatform.com
 └─┬─┘ └───┬──────────┘
   │        └── the platform domain (placeholder; V1 = subdomains ONLY)
   └────────── the tenant slug → resolves to tenants.slug → tenants.id
```

Conceptual flow:

```text
request Host: swift.yourplatform.com
   → extract subdomain "swift"
   → look up tenant by slug
   → attach { tenantId, tenantConfig } to the request context
   → every downstream query is automatically scoped to that tenantId
```

`admin.yourplatform.com` is reserved for the **platform admin control plane**
and resolves to no tenant.

In Phase 1, local development has no wildcard subdomains, so the platform runs
on `localhost` and tenant resolution is **not yet wired** — it is documented
here so every later phase builds toward it.

### Why every tenant-owned record carries `tenantId`

| Reason              | Consequence if missing                                          |
| ------------------- | --------------------------------------------------------------- |
| Shared database     | Rows of different tenants are physically mixed in one table     |
| Isolation           | Without `tenantId` in every query filter, data leaks              |
| Auditing            | Every mutation can be attributed to a tenant                    |
| Index strategy      | `(tenantId, …)` composite indexes keep lookups fast per tenant  |

### Why the backend — not the frontend — enforces isolation

> **The frontend is not a security boundary.**

Frontend filtering ("hide other tenants' rows in the UI") fails the moment a
user hand-crafts an API request: `curl /api/v1/admin/packages` returns
everything the server is willing to give. Therefore:

1. Every query in `src/server/services/**` receives `tenantId` from the
   **server-resolved request context**, never from client-supplied input.
2. A client-sent `tenantId` is treated as untrusted and either ignored or
   cross-checked against the authenticated session.
3. Public endpoints are scoped the same way: a tracking lookup resolves the
   tenant from the host, then searches that tenant's packages only.

---

## 3 · User layers

### Platform Admin  *(has an account)*

The platform owner. Controls: **tenants** (create/suspend), **website
configuration**, **branding**, platform-level management. Does **not** touch
day-to-day packages of a tenant.

### Tenant Admin  *(has an account)*

A logistics company operator. Controls **packages, package statuses, package
locations, tracking operations** — for their own tenant only. Nothing else.
(Locked: "Tenant Admin = package/tracking management only.")

### End Customer  *(NO account)*

Visits a tenant's website, enters a tracking ID, views tracking information.
That is all. Consequently: **there is no Customer table/collection.** A
customer is an anonymous HTTP request with a tracking ID. (Locked decision.)

---

## 4 · Application boundaries

| Concern                                   | Lives in                        |
| ----------------------------------------- | ------------------------------- |
| Pages, layout, branding, components       | `src/app`, `src/components`     |
| API calls from the browser                | `src/services` (only)           |
| Domain types shared with the client       | `src/types`                     |
| AuthN/Z, tenant scoping, business logic   | `src/server` (server-only)      |
| Persistence                               | `src/db` (Mongoose), MongoDB    |
| Push updates                              | Socket.IO tier (Phase 6)        |

A simple import test keeps boundaries honest: **`src/components` or
`src/hooks` importing from `src/server` is always wrong.**

---

## 5 · Package status model (locked)

Exactly five statuses, in this order. Nothing more in V1:

```text
PENDING → PROCESSED → IN_TRANSIT → ARRIVED_AT_FACILITY → DELIVERED
```

Pinned as code in `src/types/domain.ts`; mirrored in `docs/database.md`
(append-only `status_events` history) and `docs/api.md` (public payloads).

---

## 6 · Locked architectural decisions

These may not be changed silently. A change requires an explicit decision
record, doc updates, and an explanation:

| #  | Decision                                                                   |
| -- | -------------------------------------------------------------------------- |
| 1  | Next.js + React + TypeScript frontend                                     |
| 2  | Node server tier kept separate from UI (layered Express-style structure)  |
| 3  | One shared database + strict tenant isolation via `tenantId`              |
| 4  | MongoDB + Mongoose ODM — one shared database, no abstraction layer       |
| 5  | Socket.IO for realtime                                                    |
| 6  | No Customer entity — anonymous tracking                                    |
| 7  | Tenant Admin = package/tracking management only                           |
| 8  | Platform Admin = website + branding management                            |
| 9  | Tenant websites are configuration-driven, not code-per-tenant             |
| 10 | No tenant file-upload system in V1                                        |
| 11 | V1 domains = subdomains only                                               |
| 12 | Auth = secure HTTP-only cookie/session architecture (Phase 3)             |
| 13 | Package statuses = exactly the five listed above                          |

> **Recorded Phase 1 tier note:** the backend runs as a layered Node API tier
> inside the Next.js server runtime (Express-style: routes, middleware,
> controllers, services, models) rather than a separately deployed Express
> process, because the platform ships on a managed Next.js runtime. The
> architectural contract is unchanged: separate layered backend, one shared
> MongoDB database, strict tenant isolation, Socket.IO, the three user
> layers, the five-status model. The database stack is exactly the locked
> one: **MongoDB + Mongoose**. (A Phase 1 draft that briefly scaffolded
> the wrong database stack was corrected and fully removed.)

---

## 7 · Design philosophy for what gets built on this

Premium, modern, logistics-grade: strong typography, generous whitespace,
clear hierarchy, decisive CTAs, mobile-first, subtle motion, accessible.
No generic-template look, no gradient/glassmorphism noise, no card clutter.

---

## 8 · Implementation state (rolling summary)

| Layer              | Phase 1           | Phase 2                                                        |
| ------------------ | ----------------- | --------------------------------------------------------------- |
| Foundation/config  | ✅ built           | ✅ unchanged                                                     |
| Documentation      | ✅ 9 docs          | ✅ synced with the implemented data layer                        |
| Connection         | ✅ Mongoose + ping | ✅ + explicit index management (dev ensure / deploy step)        |
| Models             | — planned         | ✅ six locked collections (`src/db/models`), indexes declared   |
| Validators         | — planned         | ✅ zod foundation + per-domain schemas (live on tracking stub)  |
| API surface        | ✅ health + stubs | ✅ + readiness `/api/ready` + group stubs for auth/admin/platform |
| Security           | ✅ contracts      | ✅ headers · origin allow-list · rate limit baseline            |
| Business workflows | —                 | ⬜ Phase 3+ (auth → tenancy → packages)                          |

**Phase 10 — currently implemented:** deployment & production
infrastructure (`docs/deployment.md`, `docs/production-checklist.md`,
`docs/backup-restore.md`, `docs/troubleshooting.md`): one PM2-managed
process behind Nginx with Wildcard DNS/TLS via Cloudflare, a graceful
shutdown sequence (server → sockets → Mongo), production index ensuring,
backup/restore drills, and tag-based rollback.

**Phase 9 —** notifications & customer sharing
(`docs/notifications.md`, `docs/sharing.md`):

```text
Package → server-minted tracking ID → tenant tracking URL → customer
MongoDB → Socket.IO (transport only) → live tracking page (no storage)
```

Sharing carries only company name + tracking ID + public URL; deep links
initialize the tracking page; live feedback ("updated just now") rides
the Phase-7 broadcasts. V1 sends NO automatic email/SMS/WhatsApp.

**Phase 8 —** platform admin & website
management (`docs/platform-admin.md`, `docs/website-configuration.md`):

```text
Platform Admin → /api/v1/platform (PLATFORM_ADMIN gate)
      → Tenant  →  WebsiteConfig  →  the ONE shared Next.js renderer
                                    → every tenant's branded website
```

Overview metrics, tenant detail tabs, configuration-driven website and
branding editing (section visibility + ordering, URL-based images, SEO),
authenticated preview, and server-authorized read-only tenant dashboard
access. 113 tests.

**Phase 7 —** maps + realtime (`docs/maps.md`,
`docs/realtime.md`): Leaflet/OpenStreetMap location UX behind a
provider-agnostic geocoding abstraction (backend-mediated, debounced,
rate-limited), the search/click/drag/confirm location picker, the
customer single-marker map — and Socket.IO living on THE SAME Node HTTP
server as the app (`server.ts`), with server-authorized rooms,
broadcast-only allowlisted payloads, and emissions strictly after the
database commits. 101 tests. Phase 6 delivered tenant sites + public
tracking (89), Phase 5 package management (75), Phase 4 tenant
management (56), Phase 3 authentication (33). Earlier phases unchanged.
