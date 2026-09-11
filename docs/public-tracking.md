# Public Tracking

**IMPLEMENTED IN PHASE 6.** The unauthenticated tracking surface.

Mandatory security framing (also `docs/security.md`):

> Public tracking is **unauthenticated**.
> Therefore the API uses an **explicit public-data allowlist**.
> The public API does **not** return raw Package documents.
> Tenant identity is resolved **server-side** from the hostname.
> Tenant IDs are never trusted from the public frontend.
> Suspended and archived tenants cannot expose public tracking data.

---

## 1 · Surfaces

| Surface                              | What it is                                                       |
| ------------------------------------ | ---------------------------------------------------------------- |
| `GET /api/v1/public/track/:trackingId` | the allowlisted JSON lookup (rate-limited, host-resolved)      |
| `/track` on a tenant host            | the branded tracking page (input → result → timeline → location) |
| Root `/` on a tenant host            | the tenant website carrying the Tracking CTA → `/track`          |

No login, no account, no phone/email verification — the tracking ID **is**
the credential, which is why IDs are unguessable by design
(`PKG-{T3}-{YYYYMMDD}-{RANDOM6}`, ~0.9B random space, docs/package-management.md).

## 2 · Server logic (exact order)

```text
request host → parse (single-level subdomain of platform domain, or
{slug}.localhost locally) → slug → tenant lookup
  unknown slug/host → 404 TENANT_NOT_FOUND "This website does not exist."
  tenant SUSPENDED  → 403 TENANT_SUSPENDED "Tracking is temporarily unavailable."
  tenant ARCHIVED   → 403 TENANT_ARCHIVED  (same message)
  ACTIVE → package lookup { trackingId (uppercased), tenantId: host-tenant }
  missing OR archived → 404 PACKAGE_NOT_FOUND — identical message for both
  → allowlist projection → 200
```

Globally unique IDs do **not** weaken isolation: the lookup is still
scoped by the host's tenant, so probing tenant B's ID on tenant A's host
answers the same 404 — existence elsewhere is not confirmable.

## 3 · The allowlist (what customers may see)

`trackingId` · `packageName` · `senderName` · `receiverName` ·
`estimatedDelivery?` · `status` (one of the exact five) · `lastUpdated` ·
`currentLocation { latitude, longitude, locationName?, updatedAt } | null` ·
`timeline [{ status, note?, occurredAt }]` (ascending).

**Never exposed:** sender/receiver phones, emails, full addresses,
shipping cost, payment method/status, Mongo `_id`s, `tenantId`, internal
user data, **location history** (only the current fix is customer-visible),
session/authentication material. The mandatory negative-space assertion
lives in `tests/public-tracking.test.ts`.

## 4 · Archived packages

`archived = true` answers the exact same `404 PACKAGE_NOT_FOUND` as an
unknown ID — recorded in the same code path so the two cases are provably
indistinguishable. Archival is a concealment, not a deletion.

## 5 · Rate limiting

Dedicated bucket `public:track:{ip}` — **30 requests/minute/IP** in
addition to the global 120/min pipeline limit. One customer, one package,
a handful of refreshes — comfortably within budget; enumeration-style
scraping is throttled early. Excess → `429 RATE_LIMITED` with a friendly
message. No list/search endpoint for tracking IDs exists anywhere.

## 6 · Tracking page UX (implemented)

Tenant-branded via the same render model as the website. States: empty
input, client+server format validation, not-found, tenant-unavailable,
generic server error, loading with duplicate-submit disabled. Result:
summary (status with step indicator — never color-only), meta
(estimated delivery, last updated), **Status Timeline** (recorded events
with the current event marked, remaining lifecycle steps as upcoming),
**Current Location** (name, coordinates, updated time). Track pages are
`noindex, nofollow` — tracking IDs never belong to search engines.

## 7 · Integration boundaries (deliberately not built yet)

- **Realtime:** the page renders the latest server snapshot through REST;
  the Socket.IO phase will subscribe clients to `tracking:{trackingId}`
  rooms and re-render on `tracking:status.updated` /
  `tracking:location.updated` — the result shape already matches those
  contracts. No temporary polling exists.
- **Maps:** the location section renders coordinates against an explicit
  boundary panel ("Interactive map attaches in the Maps phase"). No fake
  map.

## 8 · Failure modes & safe errors

Unknown host → `404 "This website does not exist."` · suspended/archived
tenant → `403` with a non-revealing temporary-unavailable message ·
unknown/archived id → one shared `404` · DB failure → `500 INTERNAL_ERROR`
(logged server-side, generic client message) · everything flows through
the standard envelope and security headers.
