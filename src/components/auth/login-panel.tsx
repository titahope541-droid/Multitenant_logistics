"use client";

/**
 * Login panel — Phase 3 verification UI (deliberately not a dashboard).
 * Exercises: login → cookie session → /me → logout, and change-password.
 */

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LogOut, RefreshCcw, KeyRound } from "lucide-react";
import { ApiClientError } from "@/services/api-client";
import * as auth from "@/services/auth";
import type { SafeUser } from "@/types/domain";

function describeError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  return "Unexpected error. Please try again.";
}

export function LoginPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"login" | "me" | "logout" | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function run(kind: "login" | "me" | "logout", action: () => Promise<void>) {
    setBusy(kind);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage({ tone: "error", text: describeError(error) });
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await run("login", async () => {
      const { user: safeUser } = await auth.login({ email, password });
      setUser(safeUser);
      setPassword("");
      setMessage({ tone: "ok", text: "Session created — HTTP-only cookie set by the server." });
    });
  }

  return (
    <div className="border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
          POST /api/v1/auth/login
        </span>
        <span className={`font-mono text-[10px] tracking-[0.2em] ${user ? "text-mint" : "text-dim"}`}>
          {user ? "SESSION ACTIVE" : "NO SESSION"}
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            className="w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            Password
          </span>
          <span className="relative block">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••"
              className="w-full border border-line bg-ink px-3.5 py-2.5 pr-10 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-dim transition-colors hover:text-paper"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <button
          type="submit"
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-2 border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[11px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "login" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Sign in
        </button>

        {message ? (
          <p
            className={`border-l-2 px-3 py-2 font-mono text-[11px] leading-5 ${
              message.tone === "ok" ? "border-mint text-mint" : "border-crimson text-crimson"
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}
      </form>

      {user ? (
        <div className="border-t border-line">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 px-5 py-4 font-mono text-[11.5px] sm:px-6">
            <dt className="text-dim">id</dt>
            <dd className="truncate text-paper">{user.id}</dd>
            <dt className="text-dim">name</dt>
            <dd className="text-paper">{user.name}</dd>
            <dt className="text-dim">email</dt>
            <dd className="text-paper">{user.email}</dd>
            <dt className="text-dim">role</dt>
            <dd className="text-signal">{user.role}</dd>
            <dt className="text-dim">tenantId</dt>
            <dd className="text-paper">{user.tenantId ?? "null"}</dd>
          </dl>
          <div className="flex gap-3 border-t border-line px-5 py-4 sm:px-6">
            <button
              onClick={() =>
                run("me", async () => {
                  const { user: refreshed } = await auth.fetchCurrentUser();
                  setUser(refreshed);
                  setMessage({ tone: "ok", text: "Session re-validated by GET /auth/me." });
                })
              }
              disabled={busy !== null}
              className="inline-flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[10px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-paper/40 hover:text-paper disabled:opacity-50"
            >
              <RefreshCcw className="h-3 w-3" />
              GET /me
            </button>
            <button
              onClick={() =>
                run("logout", async () => {
                  await auth.logout();
                  setUser(null);
                  setMessage({ tone: "ok", text: "Session destroyed server-side; cookie cleared." });
                })
              }
              disabled={busy !== null}
              className="inline-flex items-center gap-2 border border-line px-3.5 py-2 font-mono text-[10px] tracking-[0.2em] text-fog uppercase transition-colors hover:border-crimson/60 hover:text-crimson disabled:opacity-50"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-t border-line px-5 py-3 font-mono text-[10px] leading-4 text-dim sm:px-6">
        <KeyRound className="h-3 w-3 shrink-0" />
        Argon2id · HTTP-only SameSite=Lax cookie · no tokens in JS-reachable storage
      </div>
    </div>
  );
}
