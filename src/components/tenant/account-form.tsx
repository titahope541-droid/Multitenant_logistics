"use client";

/**
 * Account surface for the tenant admin — change password via the Phase 3
 * endpoint. On success every other session is signed out (documented).
 */

import { useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import { changePassword } from "@/services/auth";

export function AccountForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage({
        tone: "ok",
        text: "Password updated. Every other session for this account has been signed out.",
      });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiClientError ? cause.message : "Unexpected error.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-line bg-panel p-5 sm:p-6">
      <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-signal uppercase">
        <ShieldCheck className="h-3.5 w-3.5" />
        Change password
      </p>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
          Current password
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors focus:border-signal"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
          New password — 10–128 characters
        </span>
        <input
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors focus:border-signal"
        />
      </label>
      {message ? (
        <p className={`border-l-2 px-3 py-2 font-mono text-[11px] leading-5 ${message.tone === "ok" ? "border-mint text-mint" : "border-crimson text-crimson"}`} role="status">
          {message.text}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Update password
      </button>
    </form>
  );
}
