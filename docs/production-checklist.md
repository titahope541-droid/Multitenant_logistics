# Production Checklist

Run this after the FIRST deploy and after every meaningful change. A
phase is not "deployed" until every box ticks on the live domain.

---

## A · Infrastructure

```text
[ ] DNS A records exist: @, admin, api, * (Cloudflare)
[ ] SSL/TLS mode is Full (strict); https works for root, admin, api, and a tenant subdomain
[ ] Nginx config passes `sudo nginx -t`; WebSocket map + /socket.io/ block present
[ ] IPv4 firewall: 22, 80, 443 open; nothing else (27017 closed — Atlas is separate)
[ ] pm2 status shows `meridian` online; `pm2 logs meridian` shows "ready" + "socket.io attached"
[ ] pm2 save + pm2 startup configured (process survives `sudo reboot`)
[ ] .env has real production values; no placeholder SESSION_SECRET remains
[ ] .env / .env.production are NOT in Git; repo has no secrets
[ ] indexes ensured at least once (scripts/ensure-indexes.ts) after deploy/schema change
[ ] Atlas: least-privilege DB user, VPS IP allowlisted, backups enabled
[ ] npm audit reviewed (no ignored unfixed criticals)
[ ] FULL test suite green (`npm test`) — release gate per docs/testing.md §8
```

## B · Production smoke test (the 22 steps)

```text
[ ]  1 https://yourplatform.com loads the developer portal (or your production landing)
[ ]  2 https://admin.yourplatform.com/admin loads (login visible)
[ ]  3 Platform admin login succeeds (cookie appears; HttpOnly checked)
[ ]  4 Create demo tenant via the wizard (3 steps, one admin, config initialized)
[ ]  5 https://swift.yourplatform.com shows the TENANT'S branded site (no platform branding)
[ ]  6 (dev-local equivalent: swift.localhost:<port> works too)
[ ]  7 Tenant admin login succeeds at /login, /dashboard opens
[ ]  8 Create a package; tracking ID is auto-minted (never typed)
[ ]  9 Copy tracking ID — clipboard round-trip confirmed
[ ] 10 Open the copied tracking link → /track?trackingId=… pre-loads the result
[ ] 11 Change status → customer's open page updates WITHOUT refresh; timeline extends
[ ] 12 Change location via the map picker → the public marker moves; history row exists
[ ] 13 Refresh /track → state comes from MongoDB (db-first, not sockets)
[ ] 14 Status timeline shows all events in order; "Updated <time>" indicator works
[ ] 15 Map renders; marker + coordinates match; toggle network off/on → Reconnecting → Live
[ ] 16 WhatsApp share: message contains company name + link + ID — and nothing else
[ ] 17 Suspend the tenant (admin) → public site shows the generic page, tracking disabled
[ ] 18 Tenant admin login is BLOCKED (generic 401); sessions killed
[ ] 19 Platform admin still lists/previews the tenant
[ ] 20 Restore tenant → website, tracking, and login return
[ ] 21 Archive a package → public tracking returns the SAME 404 as unknown-id
[ ] 22 Archive the tenant → all public surfaces dark; restore → everything intact
```

## C · Operations cadence

```text
[ ] Monthly restore drill done and dated (docs/backup-restore.md §5)
[ ] Release flow followed: tag → build → restart → health
[ ] Rollback path known and tested once (checkout tag → build → restart)
```

## D · Deferred by design (do NOT "finish" these in ops work)

External monitoring platforms (Sentry/Datadog/uptime) · automatic
email/SMS/WhatsApp · notification collections · Redis · multi-process
socket scaling · CDN asset pipelines · containerization of production.
