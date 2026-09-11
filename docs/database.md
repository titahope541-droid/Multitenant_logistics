# Database Architecture

> **MongoDB is the project's database and Mongoose is the ODM. V1 uses one
> shared MongoDB database with strict tenant isolation enforced by the
> backend.**

Mongoose is used **directly** — no repository/abstraction layer on top, and
no second ORM/ODM in the stack.

---

## 1 · Phase state

| IMPLEMENTED (through Phase 5)                                       | PLANNED FOR FUTURE PHASES                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Mongoose connection architecture (`src/db/index.ts`)                | Public tracking read projections (Public Tracking phase)       |
| The six locked collections as typed Mongoose models                 | Realtime broadcasts of status/location (Realtime phase)        |
| All indexes below (declared in schemas, ensured on dev boot)        | Isolation test-suite (Phase 11)                                |
| Exact five package statuses as Mongoose enum                        | Production index-ensure as deployment step (Phase 12)          |
| No Customer model anywhere                                          |                                                                |
| Dev-time index ensuring + production ensure procedure               |                                                                |
| Zod request validators mirroring the model shapes                   |                                                                |
| **Phase 3:** `sessions` infrastructure collection (TTL, hash-at-rest)|                                                               |
| **Phase 4:** transactional tenant provisioning + rollback fallback  |                                                                |
| **Phase 5:** packages actively consumed; `status_events` and `location_history` written atomically with their package mutations; server-generated unique tracking IDs (`PKG-{TENANT3}-{YYYYMMDD}-{RANDOM6}`) minted with collision retry | |
| **Phase 6:** `website_configs` actively consumed by the public renderer (no schema change); public tracking reads packages + status_events under the hostname-scoped allowlist; location_history stays server-only | |

---

## 2 · The shared-database model

```text
one MongoDB deployment · one database ("meridian")
 ├── tenants
 ├── users
 ├── packages
 ├── status_events
 ├── location_history
 └── website_configs
        tenant-owned collections carry tenantId on every document
```

Isolation contract (unchanged, locked): the backend resolves `tenantId`
from host/session and injects it into every query filter; client-supplied
tenant identifiers are never trusted; the frontend is not a security
boundary. `tenantId` on documents is the *enabler* — services enforce the
scoping (Phase 4/5).

---

## 3 · Collections — IMPLEMENTED IN PHASE 2

### `tenants` — `TenantModel` (`src/db/models/tenant.model.ts`)

One logistics company. **Identity only** — website/branding lives separately
in `website_configs` (locked separation).

| Field        | Type    | Rules                                                        |
| ------------ | ------- | ------------------------------------------------------------ |
| companyName  | String  | required, trimmed, ≤ 120                                     |
| slug         | String  | required, **unique**, lowercase, `^[a-z0-9]+(-[a-z0-9]+)*$`, 2–48 |
| status       | String  | enum `ACTIVE` / `SUSPENDED` / `ARCHIVED`, default `ACTIVE`   |
| contact      | embed   | `{ phone?, email?, address? }` — validated when present      |
| createdAt / updatedAt | Date | Mongoose `timestamps`                            |

Indexes: `{ slug: 1 }` unique (subdomain resolution) · `{ status: 1 }`
(platform admin lifecycle lists).

### `users` — `UserModel` (`src/db/models/user.model.ts`)

The only account-holders. **Every user is one of exactly two roles.**

| Field        | Type     | Rules                                                       |
| ------------ | -------- | ----------------------------------------------------------- |
| name         | String   | required, ≤ 120                                             |
| email        | String   | required, **unique**, lowercase, email-validated            |
| passwordHash | String   | required, `select: false` — never returned by queries       |
| role         | String   | enum `PLATFORM_ADMIN` / `TENANT_ADMIN` (nothing else exists)|
| tenantId     | ObjectId | `PLATFORM_ADMIN` → null · `TENANT_ADMIN` → required (validated by a pre-validate hook) |
| status       | String   | enum `ACTIVE` / `SUSPENDED`, default `ACTIVE`               |
| createdAt / updatedAt | Date | timestamps                                     |

Indexes: `{ email: 1 }` unique (login) · `{ tenantId: 1 }` (tenant membership)
· `{ role: 1 }` (role filtering) · **partial unique** `{ role: 1 } where
role=PLATFORM_ADMIN` (exactly one platform admin account) · **partial unique**
`{ tenantId: 1 } where role=TENANT_ADMIN` (exactly one tenant admin per
tenant). The two partial uniques encode the locked cardinality at the
database level.

Passwords exist ONLY as `passwordHash`. Authentication (hashing, sessions)
is Phase 3 — this phase defines the data model only.

### `packages` — `PackageModel` (`src/db/models/package.model.ts`)

One shipment, tenant-owned, with embedded operational detail.

| Field          | Type     | Notes                                                     |
| -------------- | -------- | --------------------------------------------------------- |
| tenantId       | ObjectId | **required — isolation key**                              |
| trackingId     | String   | required, **globally unique**, uppercase, 3–64            |
| packageName    | String   | required, ≤ 160                                           |
| description    | String   | optional, ≤ 1000                                          |
| status         | String   | enum — the **exact five**, default `PENDING`              |
| sender         | embed    | `{ name*, phone*, email?, address* }` — NOT a reference   |
| receiver       | embed    | `{ name*, phone*, email?, address* }` — NOT a reference   |
| specifications | embed    | `{ size?, weight? }` — size free text, weight in kg       |
| payment        | embed    | `{ paymentMethod? (FREE TEXT), paymentStatus UNPAID/PAID/REFUNDED, shippingCost ≥ 0 }` |
| delivery       | embed    | `{ estimatedDeliveryDate? }`                              |
| currentLocation| embed    | `{ latitude?, longitude?, locationName?, updatedAt? }` — cached latest fix, NOT history |
| archived       | Boolean  | soft-remove flag, default false                           |
| createdAt / updatedAt | Date | timestamps                                       |

Indexes: `{ trackingId: 1 }` unique (global lookup) ·
`{ tenantId: 1, trackingId: 1 }` (tenant-scoped tracking fetch) ·
`{ tenantId: 1, status: 1 }` (admin work queues) ·
`{ tenantId: 1, createdAt: -1 }` (newest-first lists) ·
`{ tenantId: 1, archived: 1 }` (archive filtering).

### `status_events` — `StatusEventModel`

Append-only audit trail. Rows are facts; `packages.status` is merely the
cached projection of the latest event.

| Field     | Type     | Notes                                      |
| --------- | -------- | ------------------------------------------ |
| tenantId  | ObjectId | required — isolation key                   |
| packageId | ObjectId | required, ref Package                      |
| status    | String   | enum — the exact five                      |
| note      | String   | optional, ≤ 500                            |
| createdAt | Date     | createdAt-only timestamps (events never mutate) |

Indexes: `{ packageId: 1, createdAt: 1 }` (timeline) ·
`{ tenantId: 1, packageId: 1 }` (tenant-scoped event reads).

### `location_history` — `LocationHistoryModel`

Append-only geographic trail. Current location lives on the package;
**history is never overwritten**.

| Field        | Type    | Notes                                   |
| ------------ | ------- | --------------------------------------- |
| tenantId     | ObjectId| required — isolation key                |
| packageId    | ObjectId| required, ref Package                   |
| latitude     | Number  | required, −90…90                         |
| longitude    | Number  | required, −180…180                       |
| locationName | String  | optional, ≤ 200                         |
| createdAt    | Date    | createdAt-only timestamps               |

Indexes: `{ packageId: 1, createdAt: -1 }` (trail + latest position) ·
`{ tenantId: 1, packageId: 1 }` (tenant-scoped reads).
Not exposed to customers — public projection is a later phase.

### `website_configs` — `WebsiteConfigModel`

Configuration-driven tenant website definition — **Platform Admin
controlled** (Tenant Admins have no website editing). One per tenant.

| Field       | Type      | Notes                                                        |
| ----------- | --------- | ------------------------------------------------------------ |
| tenantId    | ObjectId  | required, **unique** — one config per tenant                 |
| branding    | embed     | `{ logoUrl?, primaryColor?, secondaryColor?, fontFamily?, tagline?, heroHeadline?, heroSubtext? }` — hex/URL validated; V1 has no uploads, so logo is a hosted URL |
| navigation  | embed[]   | `[{ label, href }]` — max 10                                |
| sections    | embed     | `hero { enabled, headline?, subtext? }` · `tracking { enabled }` · `services { enabled, items[{title, description?}] ≤8 }` · `about { enabled, text? }` |
| contact     | embed     | `{ phone?, email?, address? }` — site-visible contact        |
| socialLinks | embed[]   | `[{ platform (free text), url }]` — max 8, http(s) only      |
| createdAt / updatedAt | Date | timestamps                                       |

---

## 4 · There is NO Customer collection

Explicit, locked decision — and now structurally true: sender/receiver are
**embedded subdocuments inside Package**, not references. No `customers`
collection exists in the model registry (`src/db/models/index.ts`), and no
role beside `PLATFORM_ADMIN` / `TENANT_ADMIN` exists.

---

## 5 · Tracking ID strategy

| Decision                                   | State                                   |
| ------------------------------------------ | --------------------------------------- |
| Globally unique platform-wide              | **enforced now** — unique index         |
| Server-generated, difficult to guess       | Phase 5 (generation workflow)           |
| Never typed manually by tenant admins      | honored by design — create validators accept no `trackingId` |
| Exact format                               | **not locked** — `PKG-SWL-20260908-0001` is illustrative only |

The database guarantee exists in Phase 2; the generation algorithm is a
Phase 5 decision.

---

## 6 · Why status events and location history are separate collections

| Concern            | `status_events`                          | `location_history`                       |
| ------------------ | ---------------------------------------- | ---------------------------------------- |
| Cardinality        | ≤ 5 per package (business checkpoints)   | dozens–hundreds per package (telemetry)  |
| Write pattern      | rare, transactional with package update  | frequent, fire-and-record                |
| Read pattern       | render tracking timeline                 | render map trail / latest position       |
| Retention          | kept for package lifetime (audit)        | may be pruned/sampled later              |
| Indexes            | `{ packageId, createdAt: 1 }`            | `{ packageId, createdAt: -1 }`           |

`packages.currentLocation` is a third thing again: a **cached latest fix**
for cheap reads, updated whenever a history row is appended (Phase 6).

---

## 7 · Index strategy — why each exists

Indexes are the minimum set serving the known query shapes; nothing is
indexed "just in case":

| Index                                     | Consumer                                    |
| ----------------------------------------- | ------------------------------------------- |
| tenants `{ slug }` unique                 | host → tenant resolution (Phase 4)          |
| tenants `{ status }`                      | platform admin lifecycle lists              |
| users `{ email }` unique                  | login (Phase 3)                             |
| users `{ tenantId }`, `{ role }`          | membership lists, role filtering            |
| users partial uniques (×2)                | locked cardinality: 1 platform admin; 1 tenant admin per tenant |
| packages `{ trackingId }` unique          | global uniqueness + public tracking lookup  |
| packages `{ tenantId, trackingId }`       | tenant-scoped tracking fetch                |
| packages `{ tenantId, status }`           | tenant work queues                          |
| packages `{ tenantId, createdAt: -1 }`    | newest-first admin lists                    |
| packages `{ tenantId, archived }`         | archive filtering                           |
| status_events `{ packageId, createdAt }`  | tracking timeline                           |
| status_events `{ tenantId, packageId }`   | tenant-scoped event reads                   |
| location_history `{ packageId, createdAt: -1 }` | trail, latest position                 |
| location_history `{ tenantId, packageId }`| tenant-scoped reads                         |
| website_configs `{ tenantId }` unique     | one config per tenant, config fetch         |

---

## 8 · The five locked statuses (mirrored everywhere)

```text
PENDING · PROCESSED · IN_TRANSIT · ARRIVED_AT_FACILITY · DELIVERED
```

Canonical definition: `src/types/domain.ts` → consumed identically by the
Mongoose enums, the zod validators, the realtime contracts, and the UI.
No sixth status in V1.

---

## 9 · Tenant provisioning transactions (Phase 4)

Tenant creation is a multi-document write (tenant → one tenant admin →
website config). It runs inside a real MongoDB transaction
(`withTransaction`) — **transactions require a replica set or mongos**:
Atlas tiers and a local single-node replica set (`mongod --replSet rs0` +
`rs.initiate()`) qualify; a bare standalone mongod does not. For standalone
dev, the service detects the unsupported-transaction error and falls back
to sequential creation with compensating deletes on failure — the
invariant (no tenant without admin, no orphan configs) holds in both
paths and is test-verified against a single-node replica set.

Lifecycle persistence: suspension/archival touch only `tenants.status`
plus `sessions` cleanup; no tenant-owned document is ever deleted for
lifecycle reasons (there is no hard-delete anywhere).

---

## 10 · Connection architecture (Phase 1 behaviour, extended in Phase 2)

`src/db/index.ts`: lazy `connectToDatabase()` cached on `globalThis`;
`MONGODB_URI` from env; `serverSelectionTimeoutMS: 2500` and
`bufferCommands: false` (fail fast); pino lifecycle logs; `pingDatabase()`
behind `/api/health` and `/api/ready`; graceful `SIGINT`/`SIGTERM` close.

**Phase 2 addition — index management:** `autoIndex: false` at connection
time (implicit per-boot index builds are a production anti-pattern).
In development, `ensureAllIndexes()` (`src/db/ensure-indexes.ts`) runs once
after connect and calls `createIndexes()` for every registered model.
In production, the same function is executed as an explicit deployment step
(Phase 12) rather than implicitly at boot.
