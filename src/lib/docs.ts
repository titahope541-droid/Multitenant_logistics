/**
 * Documentation registry + filesystem reader for the in-app docs browser.
 *
 * The markdown files in /docs are a core deliverable (README §9). The
 * registry pins their order and descriptions; the reader loads file content
 * at request time. Reading is server-side only (Node fs) — used by the
 * /docs routes, which are server components.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export interface DocEntry {
  slug: string;
  order: number;
  title: string;
  description: string;
}

export const DOC_ENTRIES: DocEntry[] = [
  {
    slug: "architecture",
    order: 1,
    title: "Architecture",
    description:
      "System diagram, multi-tenant model, the three user layers, boundaries, and the locked decisions.",
  },
  {
    slug: "frontend",
    order: 2,
    title: "Frontend",
    description:
      "App Router structure, components, the layered API client, hooks, types, and future tenant-aware areas.",
  },
  {
    slug: "backend",
    order: 3,
    title: "Backend",
    description:
      "The Express-style layered API tier: routes, middleware, controllers, services, models, realtime foundation.",
  },
  {
    slug: "database",
    order: 4,
    title: "Database",
    description:
      "Shared MongoDB model, the six implemented collections, tenantId isolation, indexes, and tracking ID strategy.",
  },
  {
    slug: "api",
    order: 5,
    title: "API",
    description:
      "The /api/v1 groups, the implemented auth endpoints, envelopes, and the error code registry.",
  },
  {
    slug: "authentication",
    order: 6,
    title: "Authentication",
    description:
      "Sessions, cookies, Argon2id, enumeration defenses, role and tenant authorization, CSRF/CORS posture.",
  },
  {
    slug: "tenant-management",
    order: 7,
    title: "Tenant Management",
    description:
      "Atomic provisioning, slug rules, lifecycle matrix, list querying, password reset, and admin console.",
  },
  {
    slug: "package-management",
    order: 8,
    title: "Package Management",
    description:
      "Tracking IDs, the five-status workflows, status/location history, atomic transactions, isolation, and console.",
  },
  {
    slug: "platform-admin",
    order: 9,
    title: "Platform Admin",
    description:
      "Control-plane permissions, tenant list, detail tabs, password reset, and server-authorized tenant dashboard access.",
  },
  {
    slug: "website-configuration",
    order: 10,
    title: "Website Configuration",
    description:
      "The WebsiteConfig model, branding, sections, visibility and ordering, URL images, SEO, defaults, preview.",
  },
  {
    slug: "tenant-websites",
    order: 11,
    title: "Tenant Websites",
    description:
      "Hostname resolution, configuration-driven rendering, branding, sections, SEO, status behavior, local dev.",
  },
  {
    slug: "public-tracking",
    order: 12,
    title: "Public Tracking",
    description:
      "The allowlisted tracking endpoint, safe errors, rate limiting, timelines, and integration boundaries.",
  },
  {
    slug: "maps",
    order: 13,
    title: "Maps",
    description:
      "Leaflet + OSM ecosystem, geocoding abstraction, admin location picker, customer map, licensing duties.",
  },
  {
    slug: "realtime",
    order: 14,
    title: "Realtime",
    description:
      "One HTTP server hosting Socket.IO, room authorization, DB-first events, reconnection, lifecycle.",
  },
  {
    slug: "notifications",
    order: 15,
    title: "Notifications",
    description:
      "V1 realtime-only notifications, connection feedback, and the documented future provider architecture.",
  },
  {
    slug: "sharing",
    order: 16,
    title: "Customer Sharing",
    description:
      "Tracking link generation, copy flows, WhatsApp share URL, clipboard resilience, and privacy bounds.",
  },
  {
    slug: "deployment",
    order: 17,
    title: "Deployment",
    description:
      "VPS, PM2, Nginx, Cloudflare, environment values, build flow, Git releases, rollback, onboarding.",
  },
  {
    slug: "security",
    order: 18,
    title: "Security",
    description:
      "Server-side isolation, authN/Z, session security, validation, headers, safe public payloads, socket authorization.",
  },
  {
    slug: "environment",
    order: 19,
    title: "Environment",
    description: "Every environment variable, public vs secret, local vs production principles.",
  },
  {
    slug: "backup-restore",
    order: 20,
    title: "Backup & Restore",
    description: "Atlas backups, mongodump/mongorestore, retention, and the mandatory restore drill.",
  },
  {
    slug: "troubleshooting",
    order: 21,
    title: "Troubleshooting",
    description: "WebSocket, host resolution, cookies, database, deploy, SSL — symptom to fix maps.",
  },
  {
    slug: "production-checklist",
    order: 22,
    title: "Production Checklist",
    description: "Pre-flight infrastructure list, the 22-step live smoke test, ops cadence.",
  },
  {
    slug: "testing",
    order: 23,
    title: "Testing",
    description:
      "Layered suite (unit/integration/e2e), production-safety guard, coverage matrix, release gate.",
  },
  {
    slug: "development",
    order: 24,
    title: "Development",
    description:
      "Prerequisites, setup, quality gates, seeding, manual verification, troubleshooting, workflow.",
  },
  {
    slug: "implementation-roadmap",
    order: 25,
    title: "Implementation Roadmap",
    description: "Phases 1–12 with scope, dependencies, and the standing rules for every phase.",
  },
];

const DOCS_DIR = path.join(process.cwd(), "docs");

export interface LoadedDoc {
  entry: DocEntry;
  content: string;
  index: number;
  total: number;
  prev: DocEntry | null;
  next: DocEntry | null;
}

export function getDocBySlug(slug: string): LoadedDoc | null {
  const index = DOC_ENTRIES.findIndex((entry) => entry.slug === slug);
  if (index === -1) return null;
  const entry = DOC_ENTRIES[index];
  let content: string;
  try {
    content = readFileSync(path.join(DOCS_DIR, `${entry.slug}.md`), "utf8");
  } catch {
    return null;
  }
  return {
    entry,
    content,
    index,
    total: DOC_ENTRIES.length,
    prev: index > 0 ? DOC_ENTRIES[index - 1] : null,
    next: index < DOC_ENTRIES.length - 1 ? DOC_ENTRIES[index + 1] : null,
  };
}
