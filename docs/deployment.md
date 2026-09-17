# Deployment

The complete production deployment guide. One VPS, one process, one
MongoDB Atlas cluster, Cloudflare in front.

> Architecture mapping (honest note): the V1 single unified process
> (`server.ts`) hosts the Next request handler AND Socket.IO at one
> upstream, so Nginx routes every surface — root, `admin.`, `api.`, and
> `*.yourplatform.com` — to **one** origin. There is no second backend
> process and there are no per-tenant deployments.

```text
   `*.nttrack.com` — to **one** origin. There is no second backend
   │  HTTPS / WSS
   ▼
CLOUDFLARE  — DNS, wildcard DNS, SSL/TLS, caching (static-ish only)
   ▼
NGINX       — TLS, reverse proxy, WebSocket upgrade, headers
   ▼  127.0.0.1:3000 (never public)
PM2 → "meridian"   ONE process: Next + /api/* + Socket.IO (server.ts)
   ▼
MONGODB ATLAS — one shared cluster (backups on)
```

---

## 1 · VPS preparation (Ubuntu 24.04 LTS)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx ufw build-essential

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

# PM2 (global)
sudo npm install -g pm2
pm2 -v

# Firewall: SSH + HTTP(S) only. MongoDB is never exposed from the VPS.
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
sudo ufw status
```

Deployment user (don't run the app as root):

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
sudo mkdir -p /var/www && sudo chown deploy:deploy /var/www
```

## 2 · Get the code onto the VPS

```bash
# as deploy on the VPS
ssh-keygen -t ed25519 -C "vps-deploy"        # add the PUBLIC key in GitHub → repo → Deploy keys
cd /var/www
git clone git@github.com:YOUR_ORG/meridian-logistics-platform.git meridian
cd meridian
```

## 3 · First production install + environment

```bash
npm ci                      # reproducible install from package-lock
cp .env.example .env        # then edit it (next section)
```

Edit `.env` — **server-only values, never committed**:

```bash
NODE_ENV=production                 # (also set by the ecosystem file)
PORT=3000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/meridian
SESSION_SECRET=<openssl rand -hex 32 of YOUR OWN>
LOG_LEVEL=warn
NEXT_PUBLIC_APP_URL=https://yourplatform.com
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_PLATFORM_DOMAIN=nttrack.com
PLATFORM_HOST_SUFFIXES=             # empty in production (docs/environment.md)
GEOCODING_BASE_URL=https://nominatim.openstreetmap.org   # or your licensed instance
GEOCODING_USER_AGENT=meridian-logistics/1.0 (contact: ops@yourplatform.com)
GEOCODING_USER_AGENT=meridian-logistics/1.0 (contact: ops@nttrack.com)
GEOCODING_CONTACT=ops@nttrack.com
NEXT_PUBLIC_OSM_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Variables are read at build/boot.** `NEXT_PUBLIC_*` is intentionally
public (plain URLs only — never secrets). Server env never reaches
client code (enforced by layering, docs/environment.md).

### Cookies (deliberate narrow scope)

Cookies are **host-only** (no `Domain` attribute) — the admin session
lives on `admin.yourplatform.com`, a tenant admin session on its own
lives on `admin.nttrack.com`, a tenant admin session on its own
`{slug}.nttrack.com`. There is never a shared `.nttrack.com`
cookie: last thing you'd ever want is a tenant host riding the platform
admin's session. No `COOKIE_DOMAIN` variable exists on purpose.

## 4 · Build + indexes + start

```bash
npm run build                          # production build
npx tsx scripts/ensure-indexes.ts      # create indexes ONCE (idempotent — safe on every deploy)
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save                               # persist the process list
pm2 startup systemd                    # prints a sudo line — run it exactly as printed
```

The ecosystem file runs **one** `meridian` process (docs/ecosystem note:
rooms + in-memory rate limiting live in-process; becoming multi-instance
later = shared store + socket adapter, deferred by design).

`different commands you'll use:`

```bash
pm2 restart meridian     # full stop+start (any connection drops; graceful shutdown runs)
pm2 reload meridian      # fork mode == restart here; reload only differs under cluster mode
pm2 stop meridian        # stop without autorestart
pm2 logs meridian        # tail logs (also: ./logs/meridian-*.log)
pm2 monit
```

## 5 · Nginx

```bash
sudo cp deploy/nginx/yourplatform.conf /etc/nginx/sites-available/yourplatform.conf
# edit `nttrack.com` → your real domain everywhere in that file (server_name + cert paths)
sudo ln -s /etc/nginx/sites-available/yourplatform.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The shipped config explains every header inline; key facts: Host,
X-Real-IP, X-Forwarded-For, X-Forwarded-Proto pass through; `/socket.io/`
is dedicated with `Upgrade`/`Connection` mapped and 1-hour proxies
timeouts; bodies cap at 2 m; HTTP redirects to HTTPS except the ACME
challenge path.

## 6 · Cloudflare

1. Add the domain → Free plan → change nameservers at your registrar.
2. **DNS records** (Proxied is fine for web surfaces):

| Type | Name  | Content     | Proxy   |
| ---- | ----- | ----------- | ------- |
| A    | `@`   | VPS_IP      | Proxied |
| A    | `admin` | VPS_IP    | Proxied |
| A    | `api` | VPS_IP      | Proxied |
| A    | `*`     | VPS_IP    | Proxied |

The wildcard A record is the entire tenant-subdomain engine (wildcard
subdomains need at least the Cloudflare **Full** SSL mode; the wildcard
*free cert* on Cloudflare covers `*.nttrack.com`).
3. **SSL/TLS mode**: `Full (strict)`. Strict requires a VALID certificate
on the origin — issue one on the VPS with Certbot's `nginx` plugin OR add
a free **Cloudflare Origin Certificate** to `/etc/letsencrypt/...` paths
in the Nginx file. Never `Flexible` (traffic would be plain from edge to
origin; Secure cookies would sabotage login).
4. **Always Use HTTPS**: on. **Cache**: set a page rule/Cache Rule —
   `nttrack.com/api/*` → **Bypass cache**, `*nttrack.com/socket.io/*`
   → bypass entirely (WebSockets never cache; caching stale tracking/API
   payloads would show wrong shipments), everything else default. Do not
   cache HTML of tenant sites aggressively (branding changes should show
   quickly; default behavior is fine).
5. **WebSockets** are supported on every Cloudflare plan — nothing
   extra to enable.

## 7 · MongoDB Atlas (production)

1. Create/verify an M0+ cluster (use a dedicated PRODUCTION cluster and
   database name `meridian` — never the test/dev one; tests never touch it).
2. **Database user**: least-privilege (readWrite on `meridian` only),
   strong generated password (store in your secrets manager, then in VPS `.env`).
3. **Network access**: allow the VPS outbound IP only (Atlas → Network
   Access → Add IP). Do not use 0.0.0.0/0 in production.
4. `MONGODB_URI` uses the `mongodb+srv://...` string; TLS is default on
   Atlas. Nothing MongoDB-shaped is ever exposed to the internet/from the browser.
5. Backups: enable **Cloud Backup** (even free tiers via Atlas snapshots
   where available; otherwise follow `docs/backup-restore.md §logical`).
6. Verify: `npx tsx scripts/ensure-indexes.ts` prints the per-collection
   confirmation — run once after the first deploy and after schema shifts.

## 8 · Deploy workflow (Git-based V1 flow)

```text
local: test → commit → push
VPS:   git pull → npm ci → npm run build → pm2 restart meridian → smoke test
```

```bash
# on the VPS
cd /var/www/meridian
git pull
npm ci
npm run build
pm2 restart meridian
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
```

**Tags for clean rollbacks:**

```bash
git tag -a v1.0.0 -m "V1 production baseline" && git push origin v1.0.0
```

## 9 · Rollback procedure

```bash
cd /var/www/meridian
git fetch --tags
git checkout v1.0.0            # the last-known-good tag
npm ci                         # sync dependencies to that point
npm run build
pm2 restart meridian
curl -fsS http://127.0.0.1:3000/api/ready   # must answer 200
# then the smoke subset: homepage, admin login, one tenant site, /api/health
```

Effects, spelled out: `checkout <tag>` moves your tree to that commit
(discard nothing you care about — `git stash` first if unsure); builds do
not touch MongoDB, so rollbacks never destroy data. Roll FORWARD with
`git checkout main`.

## 10 · First production tenant onboarding

Never hand-insert tenants into MongoDB — the Platform Admin flow owns
provisioning (atomic): sign in at `admin.yourplatform.com/login` → Tenants
provisioning (atomic): sign in at `admin.nttrack.com/login` → Tenants
→ New tenant → the 3-step wizard mints tenant + admin + WebsiteConfig in
one transaction, and reveals the admin's temporary password ONCE.
Then follow `docs/production-checklist.md` (22 smoke steps incl. package
creation, deep link, live update, share message review, suspension and
restore).

## 11 · Logging & diagnosis

Pino JSON lines via `pm2 logs meridian` (files at `./logs/`). Safe by
redaction: passwords, hashes, tokens, cookies never appear. The first
things to search when something's off: `socket.io`, `tenant-resolution`,
`mongodb`, `auth`, `security`. `/api/health` is cheap liveness for a 24/7
ping; `/api/ready` (Mongo-aware) is for load balancers and post-deploy
verification. External monitoring (Sentry/Datadog/uptime) is explicitly
deferred (`docs/security.md`, scope).

## 12 · Dependency audits

`npm audit` on each deploy; never `npm audit fix --force` blindly —
forced majors can break the build silently. Evaluate per advisory:
production-relevant? compatible minor/patch? run the full gate
(lint + typecheck + test + build) after any upgrade.
