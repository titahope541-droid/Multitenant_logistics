# MERIDIAN — Multi-Tenant Logistics Tracking Platform

> **Phase 1 — Project Foundation & Documentation.**
> No business features yet. This repository is the technical bedrock every
> later phase is built on.

---

## 1 · What this platform is

Meridian is **one platform that operates many independent logistics companies**.

Every logistics company (a **tenant**) gets its own branded space under a
subdomain of the platform domain:

```text
swift.nttrack.com      ← tenant "Swift Logistics"
apex.nttrack.com       ← tenant "Apex Freight"
admin.nttrack.com      ← the platform owner's control plane
```

Each tenant receives, from the same shared application and shared database:

* a branded, configuration-driven **public website**
* **public package tracking** (customers type a tracking ID — no account)
* a **tenant admin dashboard** for managing packages and their statuses

The **platform owner** gets a control plane for managing tenants, their
website configuration, and branding.

### Multi-tenancy, precisely

One application. One MongoDB database. Many logically isolated companies.

Isolation is achieved by storing a `tenantId` on **every tenant-owned record**
and having the **server** scope every query to the resolved tenant. The
frontend never decides what a tenant may see — the backend enforces it.
See [docs/architecture.md](docs/architecture.md).

### The three user groups

| User group       | Has account? | Can do                                                            |
| ---------------- | ------------ | ----------------------------------------------------------------- |
| **Platform Admin** | Yes        | Manage tenants, website configuration, branding, platform settings |
| **Tenant Admin**   | Yes        | Manage packages, package statuses, locations, tracking operations |
| **End Customer**   | **No**     | Visit tenant site, enter a tracking ID, view tracking information |

> There is deliberately **no Customer entity / collection**. Customers are
> anonymous visitors with a tracking ID. (Locked architectural decision.)

### How components communicate

```text
Browser (tenant site, tracking page, dashboards)
      │  HTTPS, JSON — via src/services (no raw fetch in components)
      ▼
Application server — Node.js runtime
      │  layered API tier under src/server:
      │  route → middleware → controller → service → model
      ▼
Mongoose (ODM)  →  MongoDB — one shared database, tenant-scoped

Realtime tier (Phase 6): Socket.IO attaches alongside the HTTP server and
reuses the same auth + tenant scoping. Event contracts live in
src/server/realtime/.
```

---

## 2 · Technology stack

Locked. Do not casually change these (see `docs/architecture.md#locked-decisions`):

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | **Next.js** (App Router) · **React** · **TypeScript**   |
| Backend tier | **Node.js** route handlers (Express-style layering)     |
| ODM          | **Mongoose** — used directly, no abstraction layer      |
| Database     | **MongoDB** — the source of truth                       |
| Realtime     | **Socket.IO** (foundation prepared in Phase 1)          |
| Logging      | **Pino** (structured, lightweight)                      |
| Quality      | **ESLint** · **Prettier-style** conventions · strict TS |

> **Tier note:** the API tier runs inside the Next.js server runtime under
> the Express-style layered structure (routes, middleware, controllers,
> services, models) rather than as a separately deployed Express process,
> because the platform ships on a managed Next.js runtime. The architectural
> contract is unchanged: a separate, layered backend; one shared MongoDB
> database; strict tenant isolation; Socket.IO for realtime.
> `docs/backend.md` documents the tier exactly as built.

---

## 3 · Repository structure

```text
logistics-platform/
├── docs/                        ALL project documentation (core deliverable)
├── public/                      Static assets served at /
├── src/
│   ├── app/                     App Router routes (pages + API endpoints)
│   │   ├── api/                 The API tier surface (HTTP boundary)
│   │   ├── docs/                In-app documentation reader
│   │   ├── layout.tsx           Root layout (fonts, metadata, shell)
│   │   └── page.tsx             Phase 1 developer portal (homepage)
│   ├── components/              Reusable, presentational UI components
│   ├── db/                      Mongoose: connection + models/ (six locked collections) + ensure-indexes
│   ├── hooks/                   Reusable React hooks (client side)
│   ├── lib/                     Framework-agnostic constants, registries, utils
│   ├── server/                  ◄ THE BACKEND TIER (never imported by client code)
│   │   ├── config/              Environment loading & validation (MONGODB_URI…)
│   │   ├── http/                Response envelopes, error model, handler middleware
│   │   ├── middleware/          Cross-cutting request concerns (grows per phase)
│   │   ├── services/            Business logic lives here — never in routes
│   │   ├── validators/          Zod request-validation foundation (live boundary)
│   │   ├── realtime/            Socket.IO event contracts (Phase 6 attaches server)
│   │   └── utils/               Logger (pino) and server-only helpers
│   ├── services/                ◄ BROWSER API CLIENT (the only way UI talks to the API)
│   └── types/                   Shared TypeScript types (API envelopes, domain)
├── .env.example                 Environment template — placeholders only
├── .gitignore
├── package.json                 Scripts: dev / build / start / lint / typecheck
└── tsconfig.json                Strict TypeScript, @/* → src/*
```

> **Monorepo note:** the brief's `frontend/` + `backend/` split is realised
> here as two *hard module boundaries in one deployable*: everything a browser
> may import lives outside `src/server/`; everything server-only (including
> all Mongoose/database code) lives inside it plus `src/db`. This keeps one
> build (`npm run build`) and zero build-system plumbing — per the "no
> unnecessary infrastructure" rule.

---

## 4 · Prerequisites

| Tool      | Version  | Why                                                        |
| --------- | -------- | ---------------------------------------------------------- |
| Node.js   | **20 LTS or newer** | Next.js 16 requires Node ≥ 20. LTS chosen for stability. |
| npm       | 10+      | Ships with Node 20. Only package manager used here.        |
| Git       | any      | Version control.                                           |
| MongoDB   | **6+ local**, or a **MongoDB Atlas** account | Source of truth, reached via `MONGODB_URI`. |

## 5 · Installation

```bash
git clone <repo-url> logistics-platform
cd logistics-platform
npm install
```

## 6 · Environment setup

```bash
cp .env.example .env
# edit .env — point MONGODB_URI at your local mongod or Atlas cluster
```

Rules: real `.env` files are git-ignored. Secrets never carry the
`NEXT_PUBLIC_` prefix. Full reference: [docs/environment.md](docs/environment.md).

## 7 · Development

```bash
npm run dev          # http://localhost:3000
```

The homepage is the **Phase 1 developer portal**: live API + database health,
the layered architecture map, locked decisions, the 12-phase roadmap, and the
in-app documentation reader at `/docs`.

```bash
curl http://localhost:3000/api/health
# { "success": true, "message": "API is healthy",
#   "data": { "checks": { "database": { "status": "up", … } }, … } }
```

> If MongoDB isn't reachable yet, health still answers 200 with
> `database: "down"` — liveness and readiness are deliberately separated
> (docs/backend.md §7). Start mongod or fix `MONGODB_URI` and it flips to `up`.

## 8 · Quality checks

```bash
npm run lint         # ESLint (flat config, next/core-web-vitals)
npm run typecheck    # tsc --noEmit — strict mode, no `any` drift
npm run build        # production build — the real gate before shipping
```

Conventions: no `any` unless genuinely unavoidable · small modules · business
logic in `src/server/services` · UI talks to the API only through
`src/services` · Mongoose only inside `src/server` / `src/db` · formatting
follows the checked-in conventions (2-space, double quotes, trailing commas,
semicolons).

## 9 · Documentation map

Documentation is a **core deliverable**, kept in sync with implementation
(rule: implementation and docs must never contradict each other).

| Document                                                                 | Covers                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)                             | System diagram, multi-tenancy, user layers, locked decisions  |
| [docs/frontend.md](docs/frontend.md)                                     | App Router layout, components, services, hooks, future areas  |
| [docs/backend.md](docs/backend.md)                                       | The layered API tier, request flow, Mongoose layer, Socket.IO |
| [docs/database.md](docs/database.md)                                     | MongoDB shared-DB model, planned collections, indexes         |
| [docs/api.md](docs/api.md)                                               | `/api/v1` groups, error envelope, planned endpoints           |
| [docs/security.md](docs/security.md)                                     | Isolation, authN/Z, cookies, validation, headers, Socket.IO   |
| [docs/environment.md](docs/environment.md)                               | Every env var (MONGODB_URI…), public vs secret                |
| [docs/development.md](docs/development.md)                               | Day-to-day workflow, troubleshooting, quality gates           |
| [docs/implementation-roadmap.md](docs/implementation-roadmap.md)         | Phases 1–12 with scope                                        |

The same documentation is readable in-app at **`/docs`**.

## 10 · Phase state

* ✅ **Phase 1:** foundation, config, documentation, health endpoint,
  Mongoose connection architecture, realtime contract, dev portal.
* ✅ **Phase 2:** the six locked Mongoose collections (typed models +
  indexes + tenant ownership structure), zod validation foundation,
  readiness (`/api/ready`), security middleware baseline.
* ✅ **Phase 3:** authentication & authorization — server-side MongoDB
  sessions, Argon2id, role + tenant gates, seed tooling, 33 security tests.
* ✅ **Phase 4:** tenant management — transactional provisioning, slug
  rules, lifecycle matrix, `/admin` control plane, password reset, 56 tests.
* ✅ **Phase 5:** package management — server-minted tracking IDs, atomic
  status/location history, `/dashboard` tenant console, 75 tests.
* ✅ **Phase 6:** tenant websites + public tracking —
  hostname tenant resolution (`{slug}.yourplatform.com`, `{slug}.localhost`
  locally), configuration-driven branded sites with zero platform
  branding, generic suspended/archived surfaces, the `noindex` `/track`
  page, and the allowlisted unauthenticated tracking API
  (`GET /api/v1/public/track/:trackingId`, 30/min/IP).
* ✅ **Phase 7:** maps + realtime — Leaflet/OSM location
  UX behind a provider-agnostic geocoding abstraction (backend-mediated,
  debounced, rate-limited), search/click/drag/confirm location picker with
  graceful reverse geocoding, customer single-marker map, and Socket.IO
  sharing the ONE Node HTTP server (`server.ts`) with authorized
  `tracking:{id}` / `tenant:{id}` rooms, broadcast-only allowlisted
  payloads, DB-first emissions, and reconnect resync — 101 passing tests.
* ✅ **Phase 8:** platform admin & website management —
  the `/admin` control plane with overview metrics, tenant detail tabs,
  configuration-driven website + branding editors (section visibility and
  ordering, URL-based images, SEO), authenticated preview, and
  server-authorized read-only tenant dashboard access — 113 passing tests.
* ✅ **Phase 9:** notifications & customer sharing —
  canonical tracking-link builder (`{slug}.{domain}/track?trackingId=`),
  Copy ID / Copy Link / WhatsApp share controls on creation, details and
  list rows, deep-link tracking pages, and subtle live-update indicators
  on the customer page — 120 passing tests.
* ✅ **Phase 10:** deployment & production infrastructure —
  unified-production `server.ts` under PM2 (`meridian`, one process),
  Nginx reverse proxy with the WebSocket map and wildcard server block
  (`deploy/nginx/yourplatform.conf`), Cloudflare DNS/TLS guidance, Atlas
  production + logical/Atlas backups with a restore drill, graceful
  shutdown, rollback via tags, and complete ops documentation
  (deployment / backup-restore / troubleshooting / production-checklist).
* ✅ **Phase 11 (this repo state):** reliability, testing & security
  hardening — suite restructured into unit/integration/e2e layers with
  per-layer scripts and a hard production-refusal guard, coverage raised
  to 156 checks (rate limiter, origin allow-list, locked index inventory,
  validation battery, health/readiness, the IDOR isolation matrix, and a
  full business-flow e2e), plus production HSTS and a JSON body ceiling.
  Release gate: `npm run quality`.
* ⏭ **Phase 12:** Production launch (execution via docs/production-checklist.md).

**Contributing rule:** architecture decisions are not changed silently during
implementation. If one must change, record the decision, update the affected
docs, and explain why — in the same change.
