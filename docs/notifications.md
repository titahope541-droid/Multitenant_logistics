# Notifications

**V1 scope — IMPLEMENTED IN PHASE 9.**

> **V1 does not automatically send email, SMS, or WhatsApp messages.**

There is no notification collection, no notification-preference system,
no provider integration, and nothing stored about "who was told what".

---

## 1 · What "notifications" mean in V1

| Channel                 | Mechanism                                   | Storage |
| ----------------------- | ------------------------------------------- | ------- |
| Live status/location updates (customer) | Socket.IO broadcast to the tracking page | none — transport only |
| "Updated just now" / "Live" / "Reconnecting…" indicators | subtle UI state, derived from socket lifecycle | none |
| Sharing to a customer   | manual: copy / wa.me share link (admin chooses) | none |

Everything else is **deferred by design**: automatic email, SMTP,
SendGrid/Resend/Mailgun, SMS providers, Twilio, WhatsApp Business API,
webhooks, templates, preferences, campaigns, marketing automation.

## 2 · Realtime updates ARE the notification system of V1

```text
admin confirms a change
  → MongoDB writes (source of truth, atomic)
  → Socket.IO emits AFTER the commit (transport)
  → connected tracking pages update in place:
      status pill · timeline entry · map marker · timestamps
  → subtle feedback: "Updated <time>" beside the connection chip
```

On disconnect the chip reads `Reconnecting…`; on reconnect the page
re-fetches the REST snapshot — database truth wins, missed events are
never assumed (`docs/realtime.md §6`). No persistent notification record
is created or needed for this flow.

## 3 · Why no stored notifications in V1

A notification store exists to queue async delivery ("email the receiver
when IN_TRANSIT"). V1's realtime notifications are ephemeral and
per-connection; customers actively open the tracking link and stay
live-updated. Persisting socket traffic would create a shadow of
MongoDB's own history (`status_events`, `location_history`) — duplication
without deliverable value, and explicitly rejected by the locked scope.

## 4 · Future architecture (documented, NOT built)

```text
Package Event (status/location changed)
        ↓
Notification Service (subscribes to domain events)
        ↓
Email Provider · SMS Provider · WhatsApp Provider
        (each behind a provider interface, like GeocodingProvider)
```

Properties that future phase must honour: delivery is background and
consumes the same events the realtime tier already fans out; the
database stays the sole truth (providers can fail without corrupting
package state); content carries only public-safe data; and receiver
contact details (already embedded in packages) are the ONLY possible
recipients — there is never a Customer account.
