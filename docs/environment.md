# Environment Configuration

One template: **`.env.example`** (committed, placeholders only).
Real values live in **`.env`** (git-ignored) or the deployment secret store.

---

## 1 · The golden rule

> Anything prefixed `NEXT_PUBLIC_` is compiled into the browser bundle and
> visible to every visitor. **Never** place secrets in a public variable.

Server-only variables never get the prefix and are only read inside
`src/server/**` or `src/db/**`.

---

## 2 · Variable reference

### Server-only (secret)

| Variable         | Purpose                                        | Example / placeholder                                        |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `MONGODB_URI`    | MongoDB connection string (Mongoose ODM)       | `mongodb://127.0.0.1:27017/meridian` (local) · `mongodb+srv://USER:PASSWORD@cluster0.example.mongodb.net/meridian` (Atlas) |
| `SESSION_SECRET` | reserved for cookie-value signing / CSRF derivation. Phase 3 sessions are opaque random tokens hashed at rest — set this anyway for the layers that will need it | `replace_with_secure_random_value`                           |
| `PLATFORM_HOST_SUFFIXES` | comma-separated extra host suffixes that serve the PLATFORM surface only (previews/staging). Tenants never resolve through them. While `NEXT_PUBLIC_PLATFORM_DOMAIN` is still the placeholder, the managed preview host suffix is auto-included | empty (production) |
| `LOG_LEVEL`      | pino level: trace/debug/info/warn/error/fatal  | `info`                                                       |

### Public (non-secret, shipped to browsers)

| Variable                      | Purpose                                  | Example              |
| ----------------------------- | ---------------------------------------- | -------------------- |
| `NEXT_PUBLIC_APP_URL`         | absolute origin for links/SEO            | `http://localhost:3000` |
| `NEXT_PUBLIC_API_BASE_URL`    | API base path for the browser client     | `/api/v1`            |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | platform domain (subdomains) | `nttrack.com`   |

---

## 3 · Where values are read

| Code location                    | Variables                              |
| -------------------------------- | -------------------------------------- |
| `src/db/index.ts`                | `MONGODB_URI`                          |
| `src/server/config/env.ts`       | all server-only vars (validated, typed)|
| `src/services/api-client.ts`     | `NEXT_PUBLIC_API_BASE_URL`             |

Config is loaded through `src/server/config/env.ts` — modules import **typed
config**, never `process.env` scattered through business code.

---

## 4 · Local development

```bash
cp .env.example .env
# MONGODB_URI defaults to a local mongod instance
```

No wildcard subdomains locally in Phase 1 → the app runs on `localhost`;
tenant host-resolution is documented for Phase 4
(`docs/architecture.md §2`).

## 5 · Production variable table (deployment reference)

| Variable | Scope | Sensitive? | Production value |
| -------- | ----- | ---------- | ---------------- |
| `NODE_ENV` | server | no | `production` (set by PM2 ecosystem too) |
| `PORT` | server | no | `3000` behind Nginx — never public |
| `MONGODB_URI` | server | **YES** | Atlas `mongodb+srv://…` least-privilege user |
| `SESSION_SECRET` | server | **YES** | `openssl rand -hex 32` (rotate deliberately) |
| `LOG_LEVEL` | server | no | `warn` |
| `GEOCODING_BASE_URL` | server | no | licensed/self-hosted instance recommended |
| `GEOCODING_USER_AGENT` | server | no | identified UA incl. contact |
| `GEOCODING_CONTACT` | server | no | ops contact (forwarded to Nominatim policy) |
| `PLATFORM_HOST_SUFFIXES` | server | no | **EMPTY in production** (previews only) |
| `NEXT_PUBLIC_APP_URL` | public bundle | no | `https://nttrack.com` |
| `NEXT_PUBLIC_API_BASE_URL` | public bundle | no | `/api/v1` (same-origin) |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | public bundle | no | `nttrack.com` — drives tenant links AND host resolution |
| `NEXT_PUBLIC_OSM_TILE_URL` | public bundle | no | tile template URL |

Cookies: intentionally NO `COOKIE_DOMAIN` variable — cookies are
host-only (narrowest scope; docs/deployment.md §cookies).
Tenant identity comes from the Host header + `NEXT_PUBLIC_PLATFORM_DOMAIN`,
never from client-supplied tenant hints.

## 5 · Production principles

* Secrets come from the platform secret store — never from the repo, CI logs,
  or the image layer.
* `LOG_LEVEL=info` (or `warn`) in production; structured JSON output.
* Rotate `SESSION_SECRET` deliberately (invalidates sessions — communicated).
* `MONGODB_URI` points at MongoDB Atlas with TLS enforced; least-privilege
  database user for the app.
