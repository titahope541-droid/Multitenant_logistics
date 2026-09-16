import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { PLATFORM } from "@/lib/constants";
import "./globals.css";

/**
 * Root layout — runs once around every route.
 *
 * The default surface is the light PRODUCT canvas (tenant admin, platform
 * admin, tenant websites, tracking, login). The internal developer portal
 * and /docs opt into the dark portal palette with their own wrappers.
 *
 * Typography via next/font (self-hosted, zero layout shift):
 *   Space Grotesk — UI + headings
 *   IBM Plex Mono — identifiers (tracking IDs, coordinates)
 */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: `${PLATFORM.name} — Multi-Tenant Logistics Platform`,
    template: `%s — ${PLATFORM.name}`,
  },
  description:
    "One platform operating many independent logistics companies. Branded tenant sites, public package tracking, strict tenant isolation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-body antialiased">{children}</body>
    </html>
  );
}
