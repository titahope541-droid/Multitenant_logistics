# Customer Sharing

**IMPLEMENTED IN PHASE 9.** How tracking IDs and links travel from the
tenant to the customer — manual, deliberate, and privacy-bounded.

> Sharing content is exactly three things: **company name**, **tracking
> ID**, **public tracking URL**. Never contact details, never internals.

---

## 1 · The tracking link

One builder, `src/lib/tracking-link.ts`, used by every surface:

```text
production  →  https://{slug}.{NEXT_PUBLIC_PLATFORM_DOMAIN}/track?trackingId={id}
local dev   →  http://{slug}.localhost:{port}/track?trackingId={id}
```

* `NEXT_PUBLIC_PLATFORM_DOMAIN` is the only knob in production; locally
  the port comes from `NEXT_PUBLIC_APP_URL` (default 3000), and window-
  aware callers map the current local host automatically.
* The ID is always URL-encoded; links never carry `tenantId=`, MongoDB
  `_id`s, or API paths. Hostname + server-side resolution decides the
  tenant on arrival — the URL is a pointer, never an authorization token.

## 2 · Where sharing happens

| Surface | Controls |
| ------- | -------- |
| Create-package success | Tracking ID front-and-centre + Copy ID · Copy Link · WhatsApp · open tracking page |
| Package details → "Customer tracking" | same control set, available for any existing package |
| Package list rows | compact "Link" icon button (copy link without leaving the table) |
| Public `/track` result | subtle "Copy link" so a customer can forward their own link |

`/track?trackingId=…` deep links are first-class: the page validates the
query value with the same tracker regex and loads it exactly like a
manual submission — the parameter never enters markup or a query.

## 3 · WhatsApp (share URL, NOT the API)

```text
https://wa.me/?text=<encodeURIComponent(message)>
```

```text
Hello, you can track your package from {Company Name} here:

{Tracking URL}

Tracking ID: {Tracking ID}
```

wa.me opens the app on mobile and WhatsApp Web on desktop; the message
is fully encoded (special characters, ampersands, newlines handled);
nothing private is included. There is NO WhatsApp Business API, Cloud
API, webhook, template, or automation — the admin presses share,
everything else is manual. If WhatsApp isn't available, Copy Link
carries the same content.

## 4 · Clipboard resilience

`navigator.clipboard` → `execCommand("copy")` fallback → graceful manual
state: the link renders in a selectable box with "copy manually" text.
Feedback is inline ("Copied!" button state / "Opening WhatsApp…") — no
blocking dialogs — and exposed via `aria-live` where it matters.

## 5 · Privacy boundary

Share messages and links contain only company name, tracking ID, and the
public URL. Sender/receiver phones, emails and addresses, payment
metadata, internals, and admin identities can never travel — not through
the share message, and not through the destination page (the public
allowlist, `docs/public-tracking.md §3`). "Inspect the share message and
the public response" is a manual acceptance step
(`docs/development.md §5f`).

## 6 · Realtime feedback (customer-facing)

On the tracking page: `Live updates connected` · `Reconnecting…` ·
`Updated {time}` — subtle chips beside the snapshot note. They describe
connection state, never leak socket internals, and never dominate the
layout (`docs/notifications.md §2`).
