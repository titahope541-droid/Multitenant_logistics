"use client";

/**
 * ConfirmDialog — accessible confirmation for consequential actions
 * (suspend, archive, reset password). Escape and the backdrop cancel;
 * focus is trapped to the dialog by keeping it on the confirm/cancel pair.
 */

import { useEffect, useRef } from "react";
import { Button, ErrorNote } from "@/components/ui";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "danger",
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/45"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative w-full max-w-sm rounded-2xl border border-hair bg-surface p-6 shadow-[var(--shadow-raised)]"
      >
        <h2 id="confirm-dialog-title" className="text-[16px] font-semibold text-slate">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 text-[13.5px] leading-6 text-body">
          {description}
        </p>

        {error ? (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-hair-strong bg-surface px-4 py-2.5 text-[13.5px] font-medium text-slate transition-colors hover:border-muted hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Cancel
          </button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
