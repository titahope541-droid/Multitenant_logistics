# Realtime (Socket.IO)

**IMPLEMENTED IN PHASE 7.**

> **MongoDB is the source of truth. Socket.IO is only the transport.**

---

## 1 · One server, one lifecycle

```text
Node HTTP server (server.ts)
   ├── Next request handler — pages + /api/*
   └── Socket.IO            — /socket.io path
```

`server.ts` is the production entry (`npm start`, tsx) and the dev entry
(`npm run dev -- --dev` with HMR watch). `start:next` remains as a
sockets-off fallback for managed runners. The first import installs
Next's runtime baseline globals (what the `next start` CLI prepares) —
documented inline in `server.ts`. There is no second server, no second
port, no second lifecycle.

## 2 · Rooms and joining

| Room                  | Who joins                                             | How                                   |
| --------------------- | ----------------------------------------------------- | ------------------------------------- |
| `tracking:{trackingId}` | the public customer tracking ONE package            | emits `package:subscribe {trackingId}` → server authorizes → joins |
| `tenant:{tenantId}`   | authenticated TENANT_ADMIN sockets (their own tenant only) | implicit at connection from the validated session cookie |

Rooms key by **tracking ID**, never Mongo `_id` — customers must never
need internals (and the test proves the `_id` grants nothing). There is
no `all-packages` room. Room membership is implicit un-joined by
Socket.IO on disconnect; unmount/path change triggers client teardown.

## 3 · Authorization

* **Handshake:** origin allow-list (same rule as HTTP mutations); then an
  OPTIONAL session enrichment — a valid cookie upgrades the socket to its
  owner (`userId`, `role`, `tenantId`); absence means a public socket.
* **Join authorization:** the server repeats the public-tracking checks
  before any join (tenant resolved from the socket's Host and ACTIVE;
  tracking ID well-formed; package exists under THAT tenant; not
  archived). Failures map to a small safe `package:error` payload.
* **Broadcast-only:** sockets expose no write operation at all. All
  writes flow through authenticated HTTP endpoints as before.

## 4 · DB-first event sequence (the guarantee)

```text
admin action → authenticate → authorize → validate
  → MongoDB write (package update + history row, atomically) COMMITS
  → THEN broadcast:
        tracking:{trackingId} → public payload (allowlist-safe)
        tenant:{tenantId}     → same envelope + tenantId (admin room)
-> connected clients update WITHOUT refresh
```

`package.service` calls `broadcastPackage*Changed` strictly after its
transaction resolves; a failed write emits **nothing** (test-proven:
forced history-write failure → zero captured emits, package unchanged).

## 5 · Event protocol

| Event                          | Direction        | Payload (public room)                                  |
| ------------------------------ | ---------------- | ------------------------------------------------------ |
| `package:subscribe`            | client → server  | `{ trackingId }`                                       |
| `package:subscribed`           | server → client  | `{ trackingId }` (ack mirrors it)                      |
| `package:error`                | server → client  | `{ code, message }` safe subset                        |
| `tracking:status.updated`      | broadcast        | `{ trackingId, status, note?, occurredAt }`            |
| `tracking:location.updated`    | broadcast        | `{ trackingId, location{latitude, longitude, locationName?}, recordedAt }` |

Tenant rooms receive the same envelope + `tenantId`. Everything off the
REST allowlist (phones, emails, addresses, payment, costs, ids) is absent
in realtime exactly as in REST — tested by serializing emitted payloads.

## 6 · Client lifecycle (public tracking page)

```text
REST snapshot renders first        (database — always the initial truth)
socket connects → on "connect": emit package:subscribe + REST refetch
broadcasts merge into local state  (status → timeline append; location → marker move)
disconnect → subtle "Reconnecting…" chip (distinct from "package unavailable")
RECONNECT → re-subscribe + REST REFETCH (missed events can never be assumed)
unmount / trackingId change → mirrored listener removal + disconnect
```

`useTrackingRealtime` implements this; sockets never emit writes, never
poll, and the UI clearly separates "realtime disconnected" from
"tracking unavailable".

## 7 · Tenant lifecycle interaction

Suspension/archival continues to work exactly as in REST: admin sessions
die (login/API gates), and public subscriptions fail authorization the
same way — a suspended tenant serves no website, no tracking, no
subscriptions. Platform admin surfaces remain faithful to their gates.

## 8 · Failure modes & no-ops

No socket server attached (scripts, tests, `start:next` fallback) → emit
helpers no-op safely; HTTP behavior is identical. DB failure → no
broadcast. Origin rejected → handshake denied. Unknown room names are
never created client-side (rooms exist only server-side per
authorization).
