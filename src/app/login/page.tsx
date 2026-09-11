import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LoginPanel } from "@/components/auth/login-panel";
import { PLATFORM } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Authenticate with the Meridian platform — Argon2id, HTTP-only cookie sessions, server-side authorization.",
};

export default function LoginPage() {
  return (
    <main className="dotgrid relative flex min-h-screen items-center justify-center px-5 py-16">
      <div className="absolute inset-x-0 top-0 border-b border-line">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[15px] font-bold tracking-[0.22em] text-paper">
              {PLATFORM.codename}
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] text-dim">PLATFORM</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-dim uppercase transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-3 w-3" /> Portal
          </Link>
        </div>
      </div>

      <div className="w-full max-w-md">
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />
          Auth verification — Phase 03
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-paper sm:text-4xl">
          Sign in to the control plane.
        </h1>
        <p className="mt-3 mb-8 text-sm leading-6 text-fog">
          Platform Admin and Tenant Admin access. Customers do not have
          accounts — public tracking never requires sign-in.
        </p>
        <LoginPanel />
      </div>
    </main>
  );
}
