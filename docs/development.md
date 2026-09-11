# Development Guide

Practical, day-to-day. If you only read one doc before contributing, read
this one and `docs/architecture.md`.

---

## 1 · Prerequisites

Node.js 20 LTS+ (required by Next.js 16) · npm 10+ · Git · a MongoDB
instance reachable via `MONGODB_URI`. For the **transactional** tenant
provisioning path (Phase 4), MongoDB must be a replica set or mongos:
use Atlas, or run locally as a single-node replica set:

```bash
mongod --replSet rs0 --dbpath <your-db-path>   # then once:
mongosh --eval 'rs.initiate()'
```

Without it the app still works — provisioning falls back to sequential
creation with compensating rollback (see docs/database.md §9).

## 2 · Installation

```bash
git clone <repo-url> logistics-platform
cd logistics-platform
npm install
```

## 3 · Environment setup

```bash
cp .env.example .env
```

Reference for every variable: `docs/environment.md`.

## 4 · Starting the application

```bash
npm run dev          # → http://localhost:3000 — ONE process: Next + Socket.IO
npm run build        # production build
npm start            # production server: Next + Socket.IO on one port
```

Since Phase 7 the app boots through the unified `server.ts` (one Node
HTTP server hosting Next AND Socket.IO). `npm run start:next` exists as a
no-sockets fallback for managed runners. Verify the API tier:

```bash
curl -s http://localhost:3000/api/health | python3 -m json.tool
curl -s "http://localhost:3000/socket.io/?EIO=4&transport=polling"   # socket handshake
```

### Manual realtime + maps verification (Phase 7)

1. Seed demo tenant, create a package, sign in as its admin in one
   window (`/dashboard`), and open the tenant's public `/track` with the
   tracking ID in another window.
2. On the package details: type a place in the location search → pick a
   result → the map centers with a marker; click elsewhere; drag the
   marker; watch the name resolve via reverse geocoding; confirm →
   success message.
3. Without refreshing the public tab: the marker moves, location text
   updates, timestamp changes, and the connection chip stays "Live".
4. Change the package status → the public status pill and the status
   timeline update live.
5. Toggle your network off/on → the chip flips to "Reconnecting…", then
   back to "Live" with state re-synchronized from the API (no refresh).
6. Open a second tenant's tracking page with the first tenant's tracking
   ID → 404; nothing cross-streams.

Expected (trimmed):

```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "service": "meridian-api",
    "checks": { "database": { "status": "up", "latencyMs": 3 } }
  }
}
```

## 4 · (a) Database verification

With MongoDB running and `MONGODB_URI` set, hit `/api/ready` once (it
connects and, in development, ensures indexes), then verify in mongosh:

```bash
mongosh "$MONGODB_URI"
```

```javascript
show collections
// tenants, users, packages, status_events, location_history, website_configs

db.packages.getIndexes()        // …includes trackingId unique + tenantId compounds
db.users.getIndexes()           // …includes email unique + the two partial uniques
db.tenants.getIndexes()         // …includes slug unique
```

Readiness semantics: `/api/health` answers 200 whenever the process is
alive; `/api/ready` answers 200 only when MongoDB is reachable
(`503 NOT_READY` otherwise). Production index ensuring runs as a deployment
step (Phase 12) — never implicit boot work (`autoIndex` is disabled).

## 5 · Quality gates (run before every commit)

```bash
npm run lint         # ESLint flat config — zero errors expected
npm run typecheck    # strict tsc --noEmit — do not weaken strictness
npm run test         # vitest — security/unit/integration suites (must stay green)
npm run build        # production build — the final gate
```

## 5 · (a) Seeding (development only)

Credentials are provided ONLY via environment variables — nothing is ever
hardcoded, printed, or committed.

```bash
# the single Platform Admin (exactly one allowed in V1)
PLATFORM_ADMIN_NAME="Platform Owner" \
PLATFORM_ADMIN_EMAIL="owner@example.com" \
PLATFORM_ADMIN_PASSWORD="a-long-secret" \
npx tsx scripts/seed-platform-admin.ts
# rotate that account's password: append --reset-password

# a demo tenant + its single Tenant Admin
DEMO_TENANT_SLUG=swift DEMO_TENANT_COMPANY="Swift Logistics" \
DEMO_TENANT_ADMIN_NAME="Swift Ops" \
DEMO_TENANT_ADMIN_EMAIL="ops@swift.example.com" \
DEMO_TENANT_ADMIN_PASSWORD="a-long-secret" \
npx tsx scripts/seed-demo-tenant.ts
```

## 5 · (b) Manual authentication verification

With MongoDB running and the accounts seeded:

1. `npm run dev` → open `/login`, sign in as the Tenant Admin → a session
   cookie appears (DevTools → Application → Cookies: HttpOnly is checked,
   the value is an opaque string), and the panel shows id/name/email/role/
   tenantId only.
2. Click **GET /me** → session re-validates.
3. In mongosh: `db.tenants.updateOne({slug:"swift"},{$set:{status:"SUSPENDED"}})`
   → **GET /me** now fails `403 TENANT_SUSPENDED`; a new login fails with the
   generic `401 "Invalid email or password."`; set it back to `ACTIVE`.
4. Sign in as the Platform Admin → `curl -b <cookie> /api/v1/platform/anything`
   reaches `501`; as Tenant Admin the same URL fails `403 FORBIDDEN`.
5. Logout → cookie cleared, `GET /me` → `401 UNAUTHORIZED`.

## 5 · (c) Manual package verification (Phase 5)

Sign in at `/login` as a TENANT_ADMIN, then in `/dashboard`:

1. Create a package → the success screen shows a tracking ID like
   `PKG-SWI-20260909-K7Q2X9` (you never typed it); status = Pending; copy works.
2. Open details → status history contains exactly one `PENDING` event.
3. Status → Processed → In Transit → Arrived at Facility → In Transit →
   Delivered; history shows all six events in order, notes included.
4. Override proof: a second package can jump Pending → Delivered directly.
5. Update location twice → currentLocation reflects the newest fix;
   location history keeps both rows (newest first).
6. Archive → the package leaves the normal list; enable the Archive
   drawer → it appears visibly marked; Restore → it returns with the same
   tracking ID and intact histories. Status/location forms refuse to run
   while archived (`400 PACKAGE_ARCHIVED`).
7. Cross-tenant: sign in as a second tenant's admin → the first tenant's
   packages are invisible everywhere (`404`, never `403`).

Formatting follows the repo's Prettier-style conventions: 2-space indent,
double quotes, semicolons, trailing commas, ~100-col lines.

## 5 · (d) Tenant subdomains locally (Phase 6)

No DNS purchase or OS-level setup is needed in most environments — modern
browsers resolve any `*.localhost` to loopback:

| URL                                | Surface                          |
| ---------------------------------- | -------------------------------- |
| `localhost:3000`                   | developer portal                 |
| `swift.localhost:3000`             | Swift tenant website             |
| `swift.localhost:3000/track`       | Swift public tracking            |
| `localhost:3000/admin`             | platform console (platform admin)|
| `localhost:3000/dashboard`         | tenant admin console             |

If your browser does NOT resolve `*.localhost`, use
`NEXT_PUBLIC_PLATFORM_DOMAIN=lvh.me`-style wildcard services or add lines
to `/etc/hosts`:

```text
127.0.0.1  swift.localhost
127.0.0.1  apex.localhost
```

Production: `{slug}.{NEXT_PUBLIC_PLATFORM_DOMAIN}` and `admin.{domain}`
map the same way through real DNS (V1 = subdomains only).

## 5 · (e) Platform Admin & website management (Phase 8)

1. Sign in at `/login` as the PLATFORM_ADMIN → `/admin` shows tenant and
   package metrics.
2. `/admin/tenants` → search / filter / sort / paginate; **New tenant**
   runs the 3-step wizard (company → admin → initialize website) and
   reveals the one-time temporary password.
3. Open a tenant → **Website** tab: edit hero, services, about, features,
   tracking CTA, contact and footer; toggle section visibility; reorder
   with Move up/down; add social links; fill SEO. Save.
4. **Branding** tab: palette, typeface, button style, radius, theme,
   logo/favicon URLs (URLs only — no uploads). Save.
5. **Preview website** → the same renderer, behind the admin guard.
6. Visit the tenant host (`swift.localhost:3000`) → the saved
   configuration is live; check ordering and hidden sections.
7. **Admin** tab → reset the tenant admin password (shown once; old
   sessions die). **Packages** tab → read-only shipment list.
8. Sign in as the TENANT_ADMIN → `/dashboard` works; `/admin` redirects to
   login; `curl -b <cookie> /api/v1/platform/tenants/<id>/website` → 403.

## 5 · (f) Sharing & live notifications (Phase 9)

Admin side, then customer side (two windows):

1. Create a package → the success screen shows the tracking ID with
   **Copy Tracking ID** (confirm your clipboard holds it), **Copy
   Tracking Link** (paste it somewhere: it must be
   `{slug}.localhost:3000/track?trackingId=…` locally), **Share on
   WhatsApp** (wa.me opens with company name + link + ID, encoded), and
   open tracking page.
2. Package details → "Customer tracking" panel repeats the same actions
   for any existing package; list rows have a compact "Link" copier.
3. Open the copied link in a second window → the tracking page loads the
   result automatically (deep link), and a subtle "Copy link" exists for
   the customer too.
4. Change status/location as admin → the customer page updates live;
   "Updated {time}" appears beside the connection chip (MongoDB remains
   truth; the chip never lies about reconnection).
5. Message review: shared text contains company name, tracking ID, link —
   and nothing else. Public response still excludes contacts/internals.

## 5 · (g) Running the suite

```bash
npm test                 # all layers (currently 156 checks)
npm run test:unit        # pure/no-db units
npm run test:integration # MongoDB-backed services (in-memory engine)
npm run test:e2e         # service-level business flow
npm run quality          # lint + typecheck + tests + build — the release gate
```

Rules: tests never run with NODE_ENV=production (hard guard); databases
are always in-memory; the full contract is docs/testing.md.

## 6 · Troubleshooting

| Symptom                                   | Likely cause → fix                                             |
| ----------------------------------------- | -------------------------------------------------------------- |
| health shows `database: "down"`           | mongod not running / wrong `MONGODB_URI` → check `.env` + `mongosh` |
| port 3000 already in use                  | stray dev server → `lsof -i :3000` / kill the process          |
| type errors after pulling                 | dependencies changed → `npm install` then re-run `typecheck`   |
| vitest "Cannot find native binding"       | musl/edge platforms: `npm i -D @rolldown/binding-wasm32-wasi` (already included here) |
| "Module not found: Can't resolve 'pino'…" | bundling server lib into client → keep pino inside `src/server`|
| docs page 404s on a slug                  | file missing in `/docs` or slug typo in `src/lib/docs.ts`      |

## 7 · Development workflow

```text
Architecture  →  Implementation  →  Testing  →  Verification  →  Documentation
     ▲                                                                 │
     └──────────── docs updated in the SAME change as the code ◀───────┘
```

* **Architecture first.** Check `docs/architecture.md` for a locked decision
  before designing around a problem.
* **Implement in the right layer** (`docs/backend.md §2`: route → service →
  model; browser → `src/services` only).
* **Verify** with the three quality gates, not vibes.
* **Update docs in the same change.** Docs and implementation must never
  contradict each other — the consistency rule.
* Architecture decisions are **not casually changed during implementation**.
  If one must change: identify it, update affected docs, explain why — then
  proceed.
