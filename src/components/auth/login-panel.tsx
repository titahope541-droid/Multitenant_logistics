"use client";

/**
 * Login form — role-aware redirect.
 *
 * On success the server-issued session cookie is already set; the client
 * simply routes the user to the console their role owns:
 *
 *   PLATFORM_ADMIN → /admin        (platform administration)
 *   TENANT_ADMIN   → /dashboard    (tenant package operations)
 *
 * The role in the response is display/routing only — every protected page
 * and endpoint re-checks authorization server-side.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import { login } from "@/services/auth";

export function LoginPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await login({ email, password });
      const destination = user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard";
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiClientError ? cause.message : "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <span className="relative block">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-slate"
          >
            <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Button type="submit" variant="primary" loading={busy} className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
