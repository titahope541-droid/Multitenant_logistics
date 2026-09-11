# Frontend Architecture

How the UI tier is organised, and the rules that keep it clean as it grows.

---

## 1 · Folder responsibilities

```text
src/
├── app/            App Router: routes, layouts, loading/error states, metadata
│   ├── api/        HTTP boundary of the backend tier (thin handlers)
│   ├── docs/       In-app documentation reader (renders /docs/*.md)
│   ├── layout.tsx  Root shell: fonts, metadata, global chrome
│   └── page.tsx    Phase 1 developer portal
├── components/     Reusable presentational components (no business logic)
├── hooks/          Reusable client hooks (e.g. useApiHealth)
├── lib/            Framework-agnostic constants, utils, doc registry
├── services/       ◀ The ONLY place browser code talks to the API
├── types/          Shared TypeScript types (API envelopes, domain models)
└── server/         Backend tier — components/hooks NEVER import from here
```

| Folder         | Rule                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| `app/`         | One route segment per folder; `page.tsx` renders; data loading server-side     |
| `components/`  | Presentational. Props in, UI out. No `fetch`, no `process.env`                 |
| `hooks/`       | Client logic (state/effects). Calls `services/`, never raw `fetch`             |
| `lib/`         | Pure helpers + constants. Safe to import from BOTH client and server           |
| `services/`    | Browser API client. One typed module per domain area                           |
| `types/`       | Compile-time contracts. Mirrors `docs/api.md` envelopes                        |

---

## 2 · Routing (App Router)

* **Server Components by default.** Mark a component `"use client"` only when
  it needs state, effects, or browser APIs.
* `layout.tsx` wraps all routes — fonts and shared chrome live there once.
* `generateMetadata` per route when a page needs its own title/description.

Phase 1 routes:

```text
/                     developer portal
/docs                 documentation index
/docs/[slug]          rendered documentation page
/api/health           liveness + DB check        (not under /api/v1 — infra endpoint)
/api/v1/public/track/[trackingId]   returns 501 NOT_IMPLEMENTED (contract preview)
```

---

## 3 · Reusable components

Components are small, typed, and composable. Naming: `kebab-case` files,
`PascalCase` exports. Shared primitives (pills, section headings, panels)
are composed by page-level sections rather than pages styling raw divs.

---

## 4 · API communication — the layered client

```text
components / hooks
        │  call typed functions
        ▼
src/services/           health.ts … (one module per domain)
        │  uses
        ▼
src/services/api-client.ts  — base URL, JSON handling,
        │                     envelope unwrapping, error normalization
        ▼
      /api/v1/…           the server
```

Rules:

1. `fetch` appears in `api-client.ts` and **nowhere else** in browser code.
2. The client speaks the standard envelope from `docs/api.md`
   (`{ success, data }` / `{ success: false, error }`) and converts failures
   into a typed `ApiClientError` — components handle UI, not HTTP plumbing.
3. Base URL comes from `NEXT_PUBLIC_API_BASE_URL` (public by design).

---

## 5 · Hooks

`useApiHealth` (Phase 1) demonstrates the pattern: a client hook that polls a
service function and exposes `{ status, data, error, lastCheckedAt }`. Future
hooks (tracking lookup, session) follow the identical shape.

---

## 6 · TypeScript types

`src/types/api.ts` defines the envelope types; `src/types/domain.ts` pins
domain contracts — including the **five locked package statuses** — plus
`PLANNED` shapes (e.g. `Tenant`) marked as not-yet-implemented. Server code
and docs must agree with these at all times.

---

## 7 · Future areas (NOT built in Phase 1)

```text
Public Tenant Website   configuration-driven branded pages per tenant
Public Tracking         tracking-ID entry + timeline (Phase 5)
Tenant Admin            package operations dashboard (Phase 8)
Platform Admin          tenant/website management control plane (Phase 9)
```

Tenant-aware rendering will work like: host → resolved `tenantId` → load
`website_configs` → render theme/copy/components from configuration. No
per-tenant code forks — locked decision #9.

---

## 8 · Styling

Tailwind CSS with design tokens defined in `globals.css` (`@theme`).
Palette: deep ink background, fog secondary text, one **signal** accent used
sparingly, semantic colors only for status (healthy/warning/down). Typography:
Space Grotesk for display, IBM Plex Mono for technical labels — loaded via
`next/font` for zero layout shift.
