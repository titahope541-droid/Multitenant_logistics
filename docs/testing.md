# Testing

The reliability contract. 156 checks, three layers, always green before
every commit.

---

## 1 · Stack & layers

| Layer | Tool | Location | Purpose |
| ----- | ---- | -------- | ------- |
| **Unit** | Vitest | `tests/unit/**` | pure logic: passwords/hashing, tracking URLs/WhatsApp URLs, host parsing, rate limiter, origin allow-list, validation hardness, index inventory, status enum drift |
| **Integration** | Vitest + **mongodb-memory-server** | `tests/integration/**` | services against a REAL in-process MongoDB (replica set for transaction flows): auth, tenant provisioning, packages, isolation matrix, public tracking, website config, realtime emission, health/readiness |
| **Service-level E2E** | Vitest + mongodb-memory-server | `tests/e2e/**` | the full business path through the same services the HTTP layer calls (provision → login → package → public track → mutation → archive/restore) |

No extra frameworks: the Vitest setup matched the Next/React stack and
already existed — HTTP-driver/browser E2E (e.g. Playwright) is a possible
later addition, not a V1 requirement (`docs/production-checklist.md §B`
is the live smoke pass).

## 2 · Commands

```bash
npm test               # entire suite (all layers)
npm run test:unit      # pure/no-db units
npm run test:integration  # MongoDB-backed services
npm run test:e2e       # service-level business flow
npm run quality        # lint + typecheck + all tests + production build
```

## 3 · Test environment & production safety

* **Never production.** Integration tests bring up an isolated in-memory
  mongod (`mongodb-memory-server`, single node or single-node replica
  set as needed). Nothing ever touches a real URI unless you opt in.
* **Hard guard** (`tests/setup.ts`, runs before every file): the suite
  *refuses to start* when `NODE_ENV=production`, and refuses when the
  optional `MONGODB_TEST_URI` escape hatch points beyond localhost
  (scratch DB only). Destructive test traffic can never reach production
  by accident.
* `.env.test`/`MONGODB_TEST_URI` are optional debug knobs only — the
  default requires neither. Env config is resettable per-case
  (`resetServerConfigCacheForTests`).

## 4 · Coverage map (security matrix)

| Area | Guarded by | Where |
| ---- | ---------- | ----- |
| Auth: valid login | login succeeds, safe DTO only | integration/auth.service |
| Auth: wrong password / unknown email | **identical** generic 401 (no enumeration) | auth.service |
| Auth: inactive user, suspended/archived tenant login | blocked with same generic message | auth.service |
| Session: expiry, logout, password change | invalidation semantics incl. keep-current-only | auth.service |
| AuthZ: role gates | 401 anonymous, 403 wrong role, both directions | authorization |
| Tenancy: AuthContext is source of truth | 403 when binding missing; context is authoritative | authorization |
| Create: one admin, config, slug rules, rollback | transactional provisioning + compensating delete | tenant.service |
| Lifecycle: ACTIVE⇄SUSPENDED, ARCHIVED→ACTIVE | transitions + invalid rejections + session kills | tenant.service |
| Reset: temp password generation | old sessions/old password die; new password works | tenant.service |
| Packages: five statuses only | status schema + enum drift alarm | unit/validation-hardness |
| Status flow incl. repeated IN_TRANSIT + override | events preserved, chronological | package.service |
| Transactions: create/status/location | forced failure → full rollback | package.service |
| Archive/restore | hidden by default, intact history, same trackingId | package.service |
| Lat/lng ranges, notes, free-text payment method | model + boundary | package.service + unit |
| Tenant isolation (THE matrix) | cross-tenant read/update/archive/subscribe → same 404; direct history reads see 0 rows; smuggled tenantId ignored | integration/isolation-matrix |
| Public: allowlist | phones/emails/addresses/costs/ids/tenantId all absent | public-tracking |
| Public: archived ≡ unknown | identical message | public-tracking |
| Public: suspended/archived tenant | tracking/website off | public-tracking |
| Website config: validation battery | markup, bad hex/URL/icons, unknown sections, smuggled keys | website-config |
| Realtime: subscription guard | mongo-ID ≠ access, statuses, archived, cross-tenant | realtime |
| Realtime: DB-first | zero emits on failed write; payloads scrubbed | realtime |
| Geocoding: normalization/failures | provider abstraction | unit/geocoding |
| Sharing: URLs + wa.me | env-aware links, encoding, privacy | unit/sharing |
| Rate limiting/template | buckets, independence, window roll | unit/security-middleware |
| Origin allow-list | platform/subdomains/dev-localhost/foreign | unit/security-middleware |
| Indexes | locked inventory per collection | unit/index-inventory |
| Validation battery | negative weight/cost, bad emails, oversized, smuggled & unknown fields | unit/validation-hardness |
| Health/readiness | up/down reaches truth, never throws, no leaks | integration/health |
| Full business path | provision → login → package → track → mutate → archive → suspend → restore | e2e/business-flow |

## 5 · HTTP hardening in place (§26–§33 of the phase scope)

| Control | Value | Why |
| ------- | ----- | --- |
| Global rate limit | 120 req/IP/min every API response | blanket abuse floor |
| Login | 10/IP/10 min | brute-force |
| Public tracking | 30/IP/min | customers refresh; scrapers don't |
| Geocoding | 20/IP/min | provider quota respect |
| Origin allow-list | any non-GET from unknown Origin → 403 | CSRF baseline |
| JSON body ceiling | 1 MB on mutating endpoints (+2 m at Nginx) | oversized POST abuse |
| Security headers | nosniff · DENY framing · referrer/permissions policy · CSP for API · no-store · **HSTS in production** | passive hardening, zero app impact measured |
| Error contract | structured envelope only, internals logged | no stack/DB leakage |

## 6 · Frontend states & UX verification (manual + structural)

The UIs maintain explicit states everywhere: loading/empty/error/success,
confirm-pattern dangerous actions, archived drawer separation, connection
chip (Live/Reconnecting/Updated), graceful map-failure panels, archival
and suspension surfaces. Responsive/a11y smoke passes are part of
`docs/production-checklist.md`.

## 7 · Common failures & fixes

| Output | Cause | Action |
| ------ | ----- | ------ |
| `Test suite refuses to run with NODE_ENV=production` | prod flag leaked into the shell | remove the flag; tests are dev/CI only |
| binary download of mongod fails first run | offline env | re-run with network (first-run fetch, cached after) |
| argon2/vitest binding error on Alpine/musl | platform optional binding | `npm i -D @rolldown/binding-wasm32-wasi` (documented in repo) |
| "indexes ensured" missing at runtime | dev boot never connected | run `npx tsx scripts/ensure-indexes.ts` once |
| Flaky replica-set start | heavy CI host | hookTimeout is 120 s; shard larger suites |

## 8 · Release gate (non-negotiable)

`npm run quality` must be green before any deploy; Phase-10 rollout
procedures depend on it. Anything that fails the suite fails the phase —
tests describe the architecture, they are not suggestions.
