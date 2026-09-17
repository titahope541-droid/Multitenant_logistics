/**
 * Tracking link builder — the ONE place customer tracking URLs are
 * constructed (docs/sharing.md §1). Pure + client-safe; used by the
 * create-success screen, package details, package list, and the public
 * /track page so every surface produces identical links.
 *
 * Rules:
 *   · tenant links live on the TENANT hostname: {slug}.{platformDomain}
 *   · trackingId is ALWAYS URL-encoded
 *   · no tenantId=, no MongoDB _id, no API paths in a customer link
 *   · environment-aware: production → https on the platform domain;
 *     local dev → http://{slug}.localhost:{port} (NEXT_PUBLIC_APP_URL port)
 */

export interface TrackingUrlParts {
  /** Tenant slug, e.g. "swift". */
  slug: string;
  /** Server-generated tracking ID, e.g. "PKG-SWI-20260909-K7Q2X9". */
  trackingId: string;
}

export interface TrackingUrlOptions {
  /** Override the platform domain (default: NEXT_PUBLIC_PLATFORM_DOMAIN). */
  platformDomain?: string;
  /** Force local mode (`{slug}.localhost`) regardless of domain. */
  isLocal?: boolean;
  /** Local port (default derived from NEXT_PUBLIC_APP_URL, else 3000). */
  localPort?: string | number;
}

function configuredDomain(options: TrackingUrlOptions): string {
  return (
    options.platformDomain ??
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ??
    "nttrack.com"
  );
}

function isLocalEnvironment(domain: string, options: TrackingUrlOptions): boolean {
  if (options.isLocal !== undefined) return options.isLocal;
  // The placeholder domain can never carry a real production tenant site;
  // in development `*.localhost` serves tenants instead (docs/development.md).
  return domain === "nttrack.com" && process.env.NODE_ENV !== "production";
}

function localPort(options: TrackingUrlOptions): string {
  if (options.localPort !== undefined) return String(options.localPort);
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const port = new URL(appUrl).port;
      if (port) return port;
    }
  } catch {
    /* fall through */
  }
  return "3000";
}

/** Build the canonical customer tracking URL for a tenant + tracking ID. */
export function buildTrackingUrl(
  parts: TrackingUrlParts,
  options: TrackingUrlOptions = {},
): string {
  const domain = configuredDomain(options);
  const id = encodeURIComponent(parts.trackingId.trim());
  if (isLocalEnvironment(domain, options)) {
    return `http://${parts.slug}.localhost:${localPort(options)}/track?trackingId=${id}`;
  }
  return `https://${parts.slug}.${domain}/track?trackingId=${id}`;
}

/**
 * Browser convenience — builds the URL relative to the CURRENT window.
 * When the admin console is open on a local development host, tenant
 * links map to `{slug}.localhost` on the same port automatically.
 */
export function buildTrackingUrlFromWindow(parts: TrackingUrlParts): string {
  const domain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "nttrack.com";
  if (typeof window === "undefined") return buildTrackingUrl(parts);
  const hostname = window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");
  if (isLocal) {
    const port = window.location.port || "3000";
    const id = encodeURIComponent(parts.trackingId.trim());
    return `${window.location.protocol}//${parts.slug}.localhost:${port}/track?trackingId=${id}`;
  }
  return buildTrackingUrl(parts, { platformDomain: domain, isLocal: false });
}

/** WhatsApp share URL — a plain wa.me link with an encoded message.
 *  Browser-open share only: NOT the WhatsApp Business API (docs/sharing.md §3). */
export function buildWhatsAppShareUrl(input: {
  companyName: string;
  trackingId: string;
  trackingUrl: string;
}): string {
  const message = [
    `Hello, you can track your package from ${input.companyName} here:`,
    "",
    input.trackingUrl,
    "",
    `Tracking ID: ${input.trackingId}`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
