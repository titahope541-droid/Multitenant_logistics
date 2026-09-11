# Implementation Roadmap

Twelve phases. Each builds strictly on the previous one. **Future phases are
not implemented ahead of schedule** — foundations first, features later.

---

| # | Phase | Purpose | Status |
| - | ----- | ------- | ------ |
| 1 | **Project Foundation** | Repo + config, backend tier skeleton, DB connection architecture, realtime contracts, health endpoint, full documentation, developer portal | ✅ **COMPLETE** |
| 2 | **Backend + Database** | Six locked Mongoose collections with indexes + tenant ownership structure, validation foundation, readiness, security middleware baseline | ✅ **COMPLETE** |
| 3 | **Authentication** | Server-side MongoDB sessions + HTTP-only cookies, Argon2id, login/logout/me/change-password, role + tenant gates, 33 security tests | ✅ **COMPLETE** |
| 4 | **Tenant Management** | Atomic transactional provisioning (tenant + one admin + WebsiteConfig), slug rules, lifecycle matrix, platform list/details/edit endpoints, password reset, `/admin` console, 23 behavior tests | ✅ **COMPLETE** |
| 5 | **Packages + Tracking** | Tenant-admin package management: server-minted tracking IDs, five-status workflows, atomic status/location history, soft archive, `/dashboard` console, 19 behavior tests — *public tracking deferred per cross-phase decision* | ✅ **COMPLETE** |
| 6 | **Tenant Websites + Public Tracking** | Hostname tenant resolution, configuration-driven branded sites (zero platform branding), `/track` + the allowlisted unauthenticated tracking API (rate-limited, host-scoped), generic suspended/archived surfaces, 13 behavior tests — *re-sequenced per Phase-6 scope: realtime moved to 7* | ✅ **COMPLETE** |
| 7 | **Maps & Realtime Tracking** | Leaflet/OSM + provider-agnostic geocoding, search/click/drag/confirm picker, customer marker map — Socket.IO sharing the HTTP server, authorized rooms, DB-first allowlisted broadcasts, reconnect resync, 14 tests | ✅ **COMPLETE** |
| 8 | **Platform Admin & Website Management** | Control-plane console: overview metrics, tenant detail tabs (Overview/Website/Branding/Admin/Packages/Settings), configuration-driven website + branding editors with visibility/ordering/SEO, preview, server-authorized tenant dashboard reads, 12 tests | ✅ **COMPLETE** |
| 9 | **Notifications & Customer Sharing** | Canonical tracking-link builder, copy ID/link controls, wa.me share URLs (NO APIs), deep-link tracking via `?trackingId=`, live "updated just now" feedback, 7 tests | ✅ **COMPLETE** |
| 10 | **Security Hardening** | Rate limiting, security headers, CORS allowlist, CSRF checks, audit pass against `docs/security.md` | ⬜ |
| 11 | **Reliability, Testing & Security Hardening** | Suite restructure (unit/integration/e2e layers + per-layer scripts), production-refusal guard, coverage to 156 checks (rate limits, origins, index inventory, validation battery, health, IDOR matrix, business-flow e2e), HSTS + JSON body ceiling, docs/testing.md | ✅ **COMPLETE** |
| 12 | **Production Deployment** | Deployment config, env/secrets wiring, health/monitoring baseline, launch checklist | ⬜ |

---

## Phase dependencies

```text
1 foundation
 └─ 2 database ─ 3 auth ─ 4 tenancy ─ 5 packages ─ 6 realtime
                                   └─ 7 websites ─ 8 tenant admin ─ 9 platform admin
                                                       └─ 10 hardening ─ 11 QA ─ 12 deploy
```

## Standing rules for every phase

1. Docs updated in the same change as code (consistency rule).
2. Tenant isolation enforced server-side at all times.
3. No new dependencies without justification; no infrastructure beyond the
   locked architecture.
4. The five package statuses remain exactly:
   `PENDING` · `PROCESSED` · `IN_TRANSIT` · `ARRIVED_AT_FACILITY` · `DELIVERED`.
