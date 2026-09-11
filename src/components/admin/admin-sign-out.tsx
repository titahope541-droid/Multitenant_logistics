"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/services/auth";

/** Platform console sign-out — destroys the server session, then bounces. */
export function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <button
      onClick={onSignOut}
      disabled={busy}
      className="inline-flex items-center gap-2 border border-line px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-crimson/60 hover:text-crimson disabled:opacity-50"
    >
      <LogOut className="h-3 w-3" />
      {busy ? "Signing out" : "Sign out"}
    </button>
  );
}
