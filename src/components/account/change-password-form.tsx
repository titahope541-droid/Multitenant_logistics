"use client";

/**
 * Change-password form — shared by both consoles. Uses the Phase 3
 * endpoint; on success every OTHER session for the account is invalidated
 * server-side.
 */

import { useState, type FormEvent } from "react";
import { Button, ErrorNote, Field, Input, SuccessNote } from "@/components/ui";
import { ApiClientError } from "@/services/api-client";
import { changePassword } from "@/services/auth";

export function ChangePasswordForm() {
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
        text: "Password updated. Every other session has been signed out.",
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
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Current password" htmlFor="current-password" required>
        <Input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </Field>

      <Field
        label="New password"
        htmlFor="new-password"
        hint="10–128 characters. Length matters more than symbols."
        required
      >
        <Input
          id="new-password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </Field>

      {message?.tone === "ok" ? <SuccessNote>{message.text}</SuccessNote> : null}
      {message?.tone === "error" ? <ErrorNote>{message.text}</ErrorNote> : null}

      <Button type="submit" variant="primary" loading={busy}>
        Update password
      </Button>
    </form>
  );
}
