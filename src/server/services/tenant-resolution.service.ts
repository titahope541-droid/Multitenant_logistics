/**
 * Tenant resolution — the SINGLE place where "which tenant is this
 * request for?" is decided. Hostname/subdomain is authoritative; a
 * client-supplied tenantId is never consulted (docs/security.md).
 *
 * Host model (V1, subdomains only — no custom domains):
 *
 *   nttrack.com / www         → platform root (the developer portal)
 *   admin.nttrack.com         → platform admin control plane
 *   {slug}.nttrack.com        → tenant website
 *   localhost / 127.0.0.1    → platform root (local dev)
 *   {slug}.localhost         → tenant website (local dev — no DNS needed)
 *   anything else            → unknown → safe "Website Not Found"
 *
 * Local dev: most OSes/browsers resolve *.localhost to loopback; if yours
 * does not, add `127.0.0.1 swift.localhost` to /etc/hosts
 * (docs/development.md §tenant-subdomains).
 */

import { headers } from "next/headers";
import { connectToDatabase } from "@/db";
import { TenantModel } from "@/db/models/tenant.model";
import { getServerConfig } from "@/server/config/env";
import { getLogger } from "@/server/utils/logger";
import type { TenantStatus } from "@/types/domain";

const log = getLogger("tenant-resolution");

/* ── Pure host parsing (unit-tested, no I/O) ─────────────────────────────── */

export type ParsedHost =
  | { kind: "platform" }
  | { kind: "platform-admin" }
  | { kind: "tenant-host"; slug: string }
  | { kind: "unknown-host" };

function singleSubdomain(host: string, suffix: string): string | null {
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, host.length - suffix.length);
  if (!sub || sub.includes(".")) return null; // multi-level subdomains: not V1
  return sub;
}

export function parseHost(
  hostHeader: string | null | undefined,
  platformDomain: string,
  platformHostSuffixes: readonly string[] = [],
): ParsedHost {
  const host = (hostHeader ?? "").trim().toLowerCase().split(":")[0] ?? "";
  if (!host) return { kind: "platform" };
  const domain = platformDomain.trim().toLowerCase();

  if (host === "localhost" || host === "127.0.0.1") return { kind: "platform" };
  if (domain && (host === domain || host === `www.${domain}`)) return { kind: "platform" };
  if (domain && host === `admin.${domain}`) return { kind: "platform-admin" };

  /* Trusted preview/staging suffixes always serve the platform surface —
   * they are never tenant resolvers (env-configured, docs/environment.md). */
  for (const suffix of platformHostSuffixes) {
    if (suffix && host.endsWith(suffix)) return { kind: "platform" };
  }

  if (domain) {
    const slug = singleSubdomain(host, `.${domain}`);
    if (slug) return { kind: "tenant-host", slug };
  }
  const localSlug = singleSubdomain(host, ".localhost");
  if (localSlug) return { kind: "tenant-host", slug: localSlug };

  return { kind: "unknown-host" };
}

/* ── Resolution to a tenant (or not) ─────────────────────────────────────── */

export interface ResolvedTenant {
  id: string;
  companyName: string;
  slug: string;
  status: TenantStatus;
  contact: { phone?: string; email?: string; address?: string };
}

export type SiteResolution =
  | { kind: "platform" }
  | { kind: "platform-admin" }
  | { kind: "tenant"; tenant: ResolvedTenant }
  | { kind: "unknown"; host: string; slug: string | null };

export async function resolveTenantFromHostHeader(hostHeader: string | null): Promise<SiteResolution> {
  const config = getServerConfig();
  // While the platform domain is still the unconfigured placeholder and the
  // app runs on its managed preview host, that host serves the platform
  // surface (documented in docs/tenant-websites.md §preview-hosts).
  const suffixes = [
    ...config.platformHostSuffixes,
    ...(config.platformDomain === "nttrack.com" ? [".e2b.app"] : []),
  ];
  const parsed = parseHost(hostHeader, config.platformDomain, suffixes);

  if (parsed.kind === "platform") return { kind: "platform" };
  if (parsed.kind === "platform-admin") return { kind: "platform-admin" };
  if (parsed.kind === "unknown-host") {
    return { kind: "unknown", host: hostHeader ?? "", slug: null };
  }

  await connectToDatabase().catch(() => undefined);
  const tenant = await TenantModel.findOne({ slug: parsed.slug }).lean();
  if (!tenant) {
    log.info({ slug: parsed.slug }, "hostname mapped to slug but no tenant exists");
    return { kind: "unknown", host: hostHeader ?? "", slug: parsed.slug };
  }
  return {
    kind: "tenant",
    tenant: {
      id: String(tenant._id),
      companyName: tenant.companyName,
      slug: tenant.slug,
      status: tenant.status,
      contact: tenant.contact ?? {},
    },
  };
}

/** Server-component entry: reads the request's Host via next/headers. */
export async function resolveRequestSite(): Promise<SiteResolution> {
  const store = await headers();
  return resolveTenantFromHostHeader(store.get("host"));
}
