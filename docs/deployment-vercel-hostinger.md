# Vercel + Hostinger Deployment

This guide deploys the Next.js application to Vercel while the domain's DNS
remains managed in Hostinger.

## Important architecture note

The repository currently has two runtime modes:

* `server.ts` hosts Next.js and Socket.IO in one long-lived Node process.
* `start:next` runs Next.js without Socket.IO.

Vercel does not run the custom `server.ts` process or host a persistent
Socket.IO server. The application can still deploy to Vercel using the
standard Next.js runtime, but live Socket.IO updates require a separate
long-lived realtime service. Without that service, REST tracking works but the
tracking page will not receive live status/location broadcasts.

For a first deployment, use this topology:

```text
Hostinger DNS
  ├── yourdomain.com and *.yourdomain.com → Vercel
  └── realtime.yourdomain.com → separate Node host (optional, Socket.IO)

Vercel → Next.js pages + /api/*
MongoDB Atlas → shared production database
```

Do not point the domain at Hostinger web hosting unless the application is
actually being served there. Hostinger is only the DNS provider in this guide.

## 1. Prepare the repository

Before connecting Vercel, make sure the branch builds with the standard
Next.js builder:

```bash
npm ci
npm run build
```

In Vercel, use these project settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Install Command | `npm ci` |
| Output Directory | leave blank/default |
| Node.js Version | 22.x, if available |

The Vercel deployment must use the Next.js runtime, not `npm start`. Vercel
will discover the `app/` routes and API route handlers automatically.

## 2. Create the Vercel project

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, select **Add New Project** and import the repository.
3. Select the production branch.
4. Do not add the custom `server.ts` as a Vercel entrypoint.
5. Add the environment variables in the next section before the first
   production deployment.

## 3. Add Vercel environment variables

Add these variables under **Project → Settings → Environment Variables**.
Apply the production values to **Production**. Add Preview values separately
if preview deployments need database access.

### Required production variables

```text
NODE_ENV=production
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/meridian
SESSION_SECRET=<long-random-secret>
LOG_LEVEL=warn
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_PLATFORM_DOMAIN=yourdomain.com
PLATFORM_HOST_SUFFIXES=
```

### Recommended production variables

```text
GEOCODING_BASE_URL=https://nominatim.openstreetmap.org
GEOCODING_USER_AGENT=meridian-logistics/1.0 (contact: ops@yourdomain.com)
GEOCODING_CONTACT=ops@yourdomain.com
NEXT_PUBLIC_OSM_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Use a new production MongoDB Atlas database user. Never put MongoDB or session
secrets in a `NEXT_PUBLIC_*` variable.

## 4. Configure MongoDB Atlas

1. Create or select the production Atlas cluster.
2. Create a database user with read/write access to the `meridian` database.
3. Add Vercel's outbound access according to your Atlas/Vercel security
   policy. Vercel serverless functions do not have one permanent outbound IP
   on standard plans, so do not assume the local development allow-list is
   sufficient. Use Vercel's documented static-egress option if strict IP
   allow-listing is required, or use another approved network control.
4. Copy the Atlas connection string into `MONGODB_URI`.
5. Deploy, then run the index setup against the production database from a
   trusted environment:

```bash
MONGODB_URI="mongodb+srv://..." npx tsx scripts/ensure-indexes.ts
```

Never run that command against a production database from an untrusted local
machine with credentials embedded in shell history.

## 5. Add the domain to Vercel

In **Vercel → Project → Settings → Domains**, add:

```text
yourdomain.com
www.yourdomain.com
admin.yourdomain.com
*.yourdomain.com
```

The wildcard domain is required because tenant sites use:

```text
{tenant-slug}.yourdomain.com
```

Vercel may require domain verification before accepting the wildcard. Follow
the verification record it displays exactly. Do not guess verification values.

## 6. Configure DNS in Hostinger

Open **Hostinger hPanel → Domains → your domain → DNS / Nameservers → DNS
Records**. Remove conflicting `A`, `AAAA`, or `CNAME` records for the same
names before adding the Vercel records.

Use the exact target shown by Vercel if its Domains screen differs. The usual
Vercel records are:

| Type | Name | Points to | TTL | Purpose |
| --- | --- | --- | --- | --- |
| `A` | `@` | `76.76.21.21` | `300` or automatic | Root domain on Vercel |
| `CNAME` | `www` | `cname.vercel-dns.com` | `300` or automatic | `www` alias |
| `CNAME` | `admin` | `cname.vercel-dns.com` | `300` or automatic | Platform admin host |
| `CNAME` | `*` | `cname.vercel-dns.com` | `300` or automatic | All tenant subdomains |

Hostinger usually wants only the label in the **Name** field. Enter `admin`,
not `admin.yourdomain.com`, and enter `*`, not `*.yourdomain.com`, unless the
Hostinger UI explicitly requests a fully qualified name.

Do not create both an `A` and `CNAME` record for the same name. In particular,
the wildcard `*` must not have a competing wildcard `A` record.

If Vercel displays a different `A` or CNAME target, use Vercel's displayed
value. Provider targets can change.

## 7. Verify DNS and TLS

DNS changes can take minutes, but cached records can take longer. Check from a
terminal:

```bash
nslookup yourdomain.com
nslookup www.yourdomain.com
nslookup admin.yourdomain.com
nslookup swift.yourdomain.com
```

Then verify these URLs in a browser:

```text
https://yourdomain.com
https://www.yourdomain.com
https://admin.yourdomain.com/login
https://swift.yourdomain.com/track
```

Vercel provisions certificates after the domain records resolve to Vercel.
Do not enable an HTTPS redirect at another provider until the Vercel domain
shows as valid, or certificate issuance can be delayed.

## 8. Tenant host configuration

Set:

```text
NEXT_PUBLIC_PLATFORM_DOMAIN=yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
PLATFORM_HOST_SUFFIXES=
```

The application resolves tenant identity from the request `Host` header. A
tenant with slug `swift` therefore uses:

```text
https://swift.yourdomain.com
```

The `admin.yourdomain.com` host is the platform admin console. Tenant admins
sign in on their tenant host so the host-only session cookie stays isolated:

```text
https://swift.yourdomain.com/login
```

Do not use `admin.yourdomain.com` for a tenant-admin session unless the
application's authorization model is intentionally changed.

## 9. API and health checks

After deployment, check:

```text
https://yourdomain.com/api/health
https://yourdomain.com/api/ready
```

`/api/health` verifies application liveness. `/api/ready` also reports
dependency readiness, including MongoDB. A MongoDB failure should not be
diagnosed as a DNS failure.

For authenticated API calls, verify that the browser is using the same host
as the page. The app's origin protection allows the configured platform domain
and its subdomains in production.

## 10. Realtime options

### Option A: deploy without realtime first

Use Vercel's standard Next.js deployment. REST package updates and public
tracking remain available, but Socket.IO live updates are not available from
Vercel alone. The current `server.ts` Socket.IO process is not started by
Vercel.

### Option B: keep Socket.IO on a separate Node host

1. Deploy the existing `server.ts` process to a VPS or Node host.
2. Point `realtime.yourdomain.com` to that host.
3. Configure the realtime client and server for that separate origin,
   including CORS, cookies, TLS, and the Socket.IO path.
4. Use a shared Socket.IO adapter and shared event strategy if Vercel and the
   realtime host are separate processes.

This requires code changes because the current client assumes a same-origin
`/socket.io` connection. Do not claim realtime is production-ready on Vercel
until that split has been implemented and tested.

## 11. Deployment checklist

- [ ] Vercel project uses the Next.js framework and `npm run build`.
- [ ] `MONGODB_URI` and `SESSION_SECRET` are stored as encrypted Vercel variables.
- [ ] `NEXT_PUBLIC_PLATFORM_DOMAIN` is the bare domain, without `https://`.
- [ ] Hostinger has root, `www`, `admin`, and wildcard records pointing to Vercel.
- [ ] Conflicting Hostinger parking, forwarding, A, and AAAA records are removed.
- [ ] Vercel shows every domain as valid and HTTPS-enabled.
- [ ] MongoDB Atlas connectivity and indexes are verified.
- [ ] `/api/health` and `/api/ready` respond as expected.
- [ ] A real tenant hostname resolves to the correct tenant website.
- [ ] Realtime is either explicitly disabled/accepted as unavailable or deployed on a separate Node host.