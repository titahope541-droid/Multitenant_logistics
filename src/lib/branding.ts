/**
 * Branding helpers — pure, shared by server and client components.
 *
 * WebsiteConfig branding becomes CSS variables on the page root; every
 * website component consumes those variables, so a tenant is restyled by
 * configuration alone (no per-tenant CSS, no style injection: values are
 * validated hex colors / enums / bounded numbers before they get here).
 */

import type { CSSProperties } from "react";
import { FONT_CHOICES } from "@/lib/website-defaults";
import type { PublicWebsiteData } from "@/types/website";

const FONT_STACKS: Record<string, string> = {
  system: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  Inter: "Inter, ui-sans-serif, system-ui, sans-serif",
  "Space Grotesk": "var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif",
  "IBM Plex Sans": "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
  "Source Sans 3": "'Source Sans 3', ui-sans-serif, system-ui, sans-serif",
  Merriweather: "Merriweather, ui-serif, Georgia, serif",
};

function fontStack(choice: string): string {
  if ((FONT_CHOICES as readonly string[]).includes(choice)) {
    return FONT_STACKS[choice] ?? FONT_STACKS.system!;
  }
  return FONT_STACKS.system!;
}

function radiusFor(data: PublicWebsiteData): string {
  const { buttonStyle, borderRadius } = data.branding;
  if (buttonStyle === "pill") return "9999px";
  if (buttonStyle === "rounded") return `${Math.max(6, borderRadius || 8)}px`;
  return `${borderRadius || 0}px`;
}

export function brandingVars(data: PublicWebsiteData): CSSProperties {
  const b = data.branding;
  return {
    "--brand": b.primaryColor,
    "--brand-ink": b.secondaryColor,
    "--brand-accent": b.accentColor,
    "--brand-soft": `${b.primaryColor}1f`, // soft tint for pills/CTA bands
    "--brand-radius": radiusFor(data),
    backgroundColor: b.backgroundColor,
    color: b.textColor,
    fontFamily: fontStack(b.fontFamily),
  } as CSSProperties;
}
