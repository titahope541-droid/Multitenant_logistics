# Troubleshooting (production)

Symptom → cause → where to look → fix. Start with the logs —
`pm2 logs meridian` — and work down the checklist in the affected lane.

---

## WebSockets / realtime

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| WS handshake `400` | Upgrade/Connection headers not mapped | confirm `map $http_upgrade $connection_upgrade` block + `/socket.io/` location exists in `/etc/nginx/sites-enabled/yourplatform.conf` → `sudo nginx -t && sudo systemctl reload nginx` |
| `502 Bad Gateway` | app down or still booting | `pm2 status`, `pm2 logs meridian`, then `curl -i http://127.0.0.1:3000/api/health` on the VPS |
| Reconnect loop on every page | Cloudflare proxy/timeout killing idle sockets, or cookie-session confusion | bypass-cache for `/socket.io/*`, raise Cloudflare WS timeouts (default ~100s idle), confirm the socket subscribe ack appears in logs (`socket joined tracking room`) |
| "origin not allowed" at handshake | Origin header not on the allow list | requests should come from the same tenant host; production domain must equal `NEXT_PUBLIC_PLATFORM_DOMAIN` |
| Status stuck while DB changed | broadcast server down mid-boot, or room misjoin | resync happens automatically on next poll-less reconnect; verify `/api/ready`; check `pm2 logs meridian` for `package status changed` |
| ECONNREFUSED on `:3000` from Nginx | PM2 process dead | `pm2 restart meridian`; if crash-looping: `pm2 logs meridian --err --lines 100` |

## Tenant subdomain / host resolution

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Every subdomain shows developer portal | host matches a preview suffix platform list | clear `PLATFORM_HOST_SUFFIXES` in production `.env` (it is empty in production) |
| Tenant site shows "Website Not Found" | slug doesn't exist, or multi-label host, or DNS missing wildcard | verify tenant slug in `/admin/tenants`; wildcard A record `*` in Cloudflare; Nginx `server_name .yourplatform.com` |
| `invalid tracking ID` on a valid ID | ID pattern didn't match (length/charset) | IDs are uppercase alnum+dash, 3–64 chars; recheck the copied value end-to-end |
| `TENANT_NOT_FOUND` from the tracking API | Host header lost/mangled upstream | Nginx proxy_set_header Host $host must be present; Cloudflare passes Host by default |

## Cookies / authentication

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Login succeeds, immediate logout/me = 401 | Cookie blocked (Secure on http), or wrong SameSite behavior | production REQUIRES https with Full (strict); never browse the app over `http://` past Cloudflare |
| Logged out on every tab clash | host-only cookies are per-subdomain by DESIGN | sign in per console host (admin.{domain} vs {slug}.{domain}) |
| `COOKIE_DOMAIN` request | doesn't exist intentionally | see `docs/deployment.md §cookies` |

## Database

| `/api/ready` = `503 NOT_READY` | MongoDB unreachable | Atlas Network Access allows the VPS IP; credentials right; cluster paused (free tier)? pino log line `mongodb connection failed` |
| Slow first query after deploy | cold pool/index | `npx tsx scripts/ensure-indexes.ts` once after release; harmless to re-run |
| Backup questions | — | `docs/backup-restore.md` (procedure + drill) |

## Build / deploy

| Build fails on types | code issue, not infra | `npm run typecheck` locally first; never `next build --no-lint` around it |
| `EACCES` writing logs | /var/www/meridian/logs owned by root | `sudo chown -R deploy:deploy /var/www/meridian/logs` |
| PM2 didn't come back after reboot | startup hook not installed | `pm2 save` then re-run the exact sudo line from `pm2 startup systemd` |
| Deploy succeeded but site stale | browser cache/HTML cache or Cloudflare cache | hard-refresh; API+socket are already cache-bypassed per config |

## SSL

| Cloudflare `526` (invalid origin cert) | origin lacks a valid cert under Full (strict) | run `sudo certbot --nginx -d yourplatform.com -d '*.yourplatform.com'` (or install the Cloudflare Origin Cert at the paths in the Nginx file), `sudo nginx -t && sudo systemctl reload nginx` |
| Browser says insecure only on subdomain | wildcard certificate missing | certbot as above covers `*`; single-name certs won't — re-issue with `*.yourplatform.com` included |

## Recovery quick map

| Failure | Document |
| ------- | -------- |
| VPS destroyed | `docs/deployment.md` (rebuild steps 1–8) + `docs/backup-restore.md` (Atlas survives) |
| Bad app release | `docs/deployment.md §9` rollback |
| Data corruption | `docs/backup-restore.md §4–5` |
| Atlas outage | statuses: `/api/ready`; recover via Atlas console; app auto-recovers (drivers retry) |
