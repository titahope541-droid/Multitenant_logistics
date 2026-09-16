# Setup & Seeding Guide

Get this platform running on a new PC and load it with test data.
Copy-paste ready. Nothing here needs a password, key, or token from
anyone — you generate/own every credential yourself.

---

## Part 1 — Run the platform

### 1.1 Prerequisites

| Tool | Version | Check |
| ---- | ------- | ----- |
| Node.js | 20.9+ or 22 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| Git | any | `git --version` |
| MongoDB | 6+ local **or** Atlas cluster | — |

### 1.2 Get the code

```bash
git clone <your-repo-url> logistics-platform
cd logistics-platform
```

(Copied folder instead of a clone? Same thing — `cd` into it. If it
contains an `.env` from another machine, replace its values with yours
and never commit it.)

### 1.3 Create `.env`

```bash
cp .env.example .env
```

Only **two** values are mandatory:

| Variable | Required | Where to get it |
| -------- | -------- | --------------- |
| `MONGODB_URI` | YES | §1.4 below |
| `SESSION_SECRET` | YES | generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Everything else keeps working with the template defaults
(`NEXT_PUBLIC_APP_URL=http://localhost:3000`,
`NEXT_PUBLIC_PLATFORM_DOMAIN=yourplatform.com`,
`NEXT_PUBLIC_API_BASE_URL=/api/v1`, `LOG_LEVEL=info`, public Nominatim
geocoding defaults, `PLATFORM_HOST_SUFFIXES=` empty).

### 1.4 Get `MONGODB_URI` (choose one)

**Option A — Atlas (recommended, no install):**

1. **cloud.mongodb.com** → sign up free.
2. **Create cluster** → free **M0** tier → any region.
3. **Database Access → Add New Database User** → username + a strong
   generated password. *This pair is your database credential.*
4. **Network Access → Add IP Address → Add Current IP Address.**
5. **Databases → Connect → Drivers → Node.js** → copy the string.
6. Replace `<password>` with your password and add the database name
   before the query string:
   `mongodb+srv://db_user:PASSWORD@cluster0.abcde.mongodb.net/meridian?retryWrites=true&w=majority`

**Option B — local mongod:**

```bash
# install, then start it as a single-node replica set (enables transactions)
mongod --replSet rs0 --dbpath /your/db/path
mongosh --eval 'rs.initiate()'        # once, ever
```

`MONGODB_URI=mongodb://127.0.0.1:27017/meridian?replicaSet=rs0`
(A plain standalone mongod also works — provisioning falls back to a
safe rollback path — but prefer the replica set.)

### 1.5 Install, start, verify

```bash
npm ci
npm run dev        # ONE process: Next + API + Socket.IO on :3000
```

```bash
curl http://localhost:3000/api/health   # 200 = process alive
curl http://localhost:3000/api/ready    # 200 = MongoDB reachable (503 = fix URI / start mongod)
```

---

## Part 2 — Seed test data (explicit)

Three seed scripts. Run them **in order**: platform admin → tenant →
packages. Each connects to the database from `.env` (`MONGODB_URI`),
refuses to run when `NODE_ENV=production`, and prints what it did.

### 2.0 Seed summary

| # | Script | Creates | Writes to | Repeatable? |
| - | ------ | ------- | --------- | ----------- |
| 1 | `scripts/seed-platform-admin.ts` | the ONE platform owner account | `users` | no (use `--reset-password` to rotate) |
| 2 | `scripts/seed-demo-tenant.ts` | one tenant + its single tenant admin + default website config | `tenants`, `users`, `website_configs` | no per slug/email |
| 3 | `scripts/seed-demo-packages.ts` | packages with real tracking IDs, status histories, location histories | `packages`, `status_events`, `location_history` | **yes** — adds more each run |

> Packages must always be created through the app or script #3 — the
> server mints tracking IDs and writes status events. Never insert
> package documents by hand.

### 2.1 Seed 1 — the platform admin

Environment variables:

| Variable | Meaning | Example |
| -------- | ------ | ------- |
| `PLATFORM_ADMIN_NAME` | display name | `Platform Owner` |
| `PLATFORM_ADMIN_EMAIL` | login identifier (unique) | `owner@example.com` |
| `PLATFORM_ADMIN_PASSWORD` | 10–128 chars, not blank | your own strong value |

**bash / macOS / Linux:**

```bash
PLATFORM_ADMIN_NAME="Platform Owner" \
PLATFORM_ADMIN_EMAIL="owner@example.com" \
PLATFORM_ADMIN_PASSWORD="change-this-strong-password" \
npx tsx scripts/seed-platform-admin.ts
```

**Windows PowerShell** (same variables, different syntax):

```powershell
$env:PLATFORM_ADMIN_NAME="Platform Owner"
$env:PLATFORM_ADMIN_EMAIL="owner@example.com"
$env:PLATFORM_ADMIN_PASSWORD="change-this-strong-password"
npx tsx scripts/seed-platform-admin.ts
```

Expected output:

```text
seed-platform-admin: Platform Admin created (exactly one permitted in V1).
```

Behaviour you should know:

- A **second run fails** on purpose: V1 allows exactly one platform admin.
- Rotate the password by appending `--reset-password`.
- The password is stored only as an **Argon2id hash**; it is never printed,
  logged, or recoverable.

### 2.2 Seed 2 — a demo tenant (and its tenant admin)

Environment variables:

| Variable | Meaning | Example |
| -------- | ------ | ------- |
| `DEMO_TENANT_SLUG` | subdomain identifier: `swift` → `swift.localhost` locally | `swift` |
| `DEMO_TENANT_COMPANY` | display name | `Swift Logistics` |
| `DEMO_TENANT_ADMIN_NAME` | tenant admin display name | `Swift Ops` |
| `DEMO_TENANT_ADMIN_EMAIL` | tenant admin login (unique platform-wide) | `ops@swift.example.com` |
| `DEMO_TENANT_ADMIN_PASSWORD` | 10–128 chars | your own strong value |

```bash
DEMO_TENANT_SLUG=swift \
DEMO_TENANT_COMPANY="Swift Logistics" \
DEMO_TENANT_ADMIN_NAME="Swift Ops" \
DEMO_TENANT_ADMIN_EMAIL="ops@swift.example.com" \
DEMO_TENANT_ADMIN_PASSWORD="change-this-strong-password" \
npx tsx scripts/seed-demo-tenant.ts
```

Expected output:

```text
seed-demo-tenant: tenant "swift" + its Tenant Admin created.
```

This one atomic operation creates three things: the tenant, exactly one
`TENANT_ADMIN` user bound to it, and the default `website_configs`
document. Slugs must be unique and are never auto-renamed — a duplicate
fails loudly. Add a second tenant any time by re-running with a new slug
and email:

```bash
DEMO_TENANT_SLUG=apex DEMO_TENANT_COMPANY="Apex Freight" \
DEMO_TENANT_ADMIN_NAME="Apex Ops" DEMO_TENANT_ADMIN_EMAIL="ops@apex.example.com" \
DEMO_TENANT_ADMIN_PASSWORD="change-this-strong-password" \
npx tsx scripts/seed-demo-tenant.ts
```

**Alternative (no script):** sign in as the platform admin → `/admin` →
Tenants → **New tenant** → the 3-step wizard. Same atomic result, and the
one-time temporary password is displayed once on screen.

### 2.3 Seed 3 — demo packages

Environment variables:

| Variable | Default | Meaning |
| -------- | ------- | ------- |
| `DEMO_TENANT_SLUG` | `swift` | which tenant receives the packages |
| `DEMO_PACKAGE_COUNT` | `5` | how many (1–50) |

```bash
DEMO_TENANT_SLUG=swift \
DEMO_PACKAGE_COUNT=8 \
npx tsx scripts/seed-demo-packages.ts
```

Expected output — one line per package with its **final** status and
history sizes (statuses vary by design so filters and timelines have range):

```text
seed-demo-packages: creating 6 package(s) for "Swift Logistics"…
  · PKG-SWI-20260911-WRQR2U  →  PENDING  (1 status events, 1 locations)
  · PKG-SWI-20260911-HT4U57  →  PROCESSED  (2 status events, 2 locations)
  · PKG-SWI-20260911-GETQS7  →  IN_TRANSIT  (3 status events, 1 locations)
  · PKG-SWI-20260911-A7WVQV  →  ARRIVED_AT_FACILITY  (4 status events, 2 locations)
  · PKG-SWI-20260911-82HRNC  →  DELIVERED  (5 status events, 1 locations)
  · PKG-SWI-20260911-JJ9PXF  →  PENDING  (1 status events, 2 locations)
seed-demo-packages: done.
```

The script stays quiet by default (`LOG_LEVEL=error`); add
`LOG_LEVEL=info` to the command to watch every service call.

Each package is created **through the service layer**, so it has
everything a real one has: a server-minted globally unique tracking ID,
an initial `PENDING` status event, a first location-history row, free-text
payment metadata, and a varied status progression — giving the list,
filters, timelines, public tracking page, and realtime updates real data
to work with. Requires the tenant (Seed 2) to exist and be `ACTIVE`.

### 2.4 Verify the seed worked

**Through the app (fastest):**

1. `http://localhost:3000/login` → sign in as the platform admin →
   `/admin` → the tenant appears with **1 admin** and a package count.
2. Sign out → sign in as the tenant admin (`ops@swift.example.com`) →
   `/dashboard` → packages are listed with tracking IDs.
3. Open a tracking link from any row → the public page loads that
   package at `swift.localhost:3000/track?trackingId=…`.

**Through the database (ground truth):**

```bash
mongosh "$MONGODB_URI"
```

```javascript
use meridian
db.tenants.find({}, { companyName: 1, slug: 1, status: 1 })
db.users.find({}, { name: 1, email: 1, role: 1 })      // no passwordHash shown
db.website_configs.countDocuments()
db.packages.countDocuments()
db.status_events.countDocuments()
db.location_history.countDocuments()
```

Expected: one `PLATFORM_ADMIN` + one `TENANT_ADMIN` per seeded tenant, one
website config per tenant, and — after Seed 3 — packages with ≥1 status
event each.

### 2.5 Change or reset seeded passwords

| Who | How |
| --- | --- |
| Platform admin | re-run Seed 1 with `--reset-password` |
| Tenant admin | platform admin → `/admin` → tenant → **Admin** tab → *Reset password* (one-time reveal, old sessions die) |
| Tenant admin (self) | `/dashboard` → Account → change password (other sessions sign out) |

Passwords are never emailed, never displayed again, and never stored in
plaintext — only Argon2id hashes.

### 2.6 Remove test data

Only ever against a **local/test** database — never production.

```bash
mongosh "$MONGODB_URI" --eval 'db.packages.deleteMany({}); db.status_events.deleteMany({}); db.location_history.deleteMany({})'
mongosh "$MONGODB_URI" --eval 'db.tenants.deleteMany({}); db.website_configs.deleteMany({}); db.users.deleteMany({})'
```

Or wipe the whole database and re-seed:

```bash
mongosh "$MONGODB_URI" --eval 'db.dropDatabase()'
# then re-run Seeds 1 → 2 → 3
```

### 2.7 Seeding rules (why it works this way)

- Credentials enter only via environment variables — nothing is
  hardcoded, committed, or logged.
- Exactly one platform admin and one tenant admin per tenant are enforced
  by partial unique database indexes, not by trust.
- Tenant provisioning is transactional: tenant + admin + website config
  appear together or not at all.
- Package creation always goes through the service layer so tracking IDs
  and history stay truthful.

---

## Part 3 — Test drive (5–10 minutes)

1. `/login` as the **platform admin** → `/admin` shows tenants + metrics.
2. Sign out → `/login` as the **tenant admin** → `/dashboard` opens.
   Visiting `/admin` bounces back — the role gate is server-side.
3. **Create Package** → success screen shows the minted tracking ID plus
   Copy Tracking ID / Copy Tracking Link / Share on WhatsApp.
4. Open the copied link → `swift.localhost:3000/track?trackingId=…`
   pre-loads the package. (Browsers resolve `*.localhost` automatically;
   if not, add `127.0.0.1 swift.localhost` to your hosts file.)
5. Change status / location as the tenant admin → the customer page
   updates live: marker moves, timeline grows, "Updated" appears.
6. As platform admin: suspend the tenant → public site and tracking go
   dark, tenant login blocks; restore → everything returns.

## Part 4 — Run the test suite

```bash
npm test                 # 156 checks (unit + integration + e2e)
npm run test:unit        # pure, no database
npm run test:integration # services against an auto-spawned in-memory MongoDB
npm run test:e2e         # full business flow
npm run quality          # lint + typecheck + tests + production build
```

The first integration run downloads a small in-memory MongoDB binary
once (cached after). The suite refuses to run with `NODE_ENV=production`.

## Part 5 — Quick triage

| Symptom | Fix |
| ------- | --- |
| `/api/ready` = 503 | MongoDB not running / wrong `MONGODB_URI` / Atlas Network Access missing your IP |
| `next build` fails on another machine | Node below 20.9 → upgrade Node |
| "Transactions are not supported" while seeding a tenant | standalone mongod → start it with `--replSet rs0` (§1.4B) |
| Seed 1 says a platform admin already exists | expected — append `--reset-password` to rotate |
| Seed 2 fails on slug/email | that slug or email already exists — use new values |
| Port 3000 busy | `PORT=3001 npm run dev` and update `NEXT_PUBLIC_APP_URL` |
| vitest rolldown binding error (Alpine/musl) | `npm i -D @rolldown/binding-wasm32-wasi` |

## Going further

Production deployment (VPS, Nginx + PM2, Cloudflare wildcard DNS/TLS,
Atlas production, backups, rollback, 22-step smoke test):
`docs/deployment.md`, `docs/production-checklist.md`,
`docs/backup-restore.md`, `docs/troubleshooting.md`.
