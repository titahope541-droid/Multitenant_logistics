"use client";

/**
 * Shared Platform-Admin form primitives — one implementation reused by
 * every tab (labels bound to controls, visible focus, accessible errors).
 */

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-dim/60 focus:border-signal";

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </Field>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} color picker`}
          className="h-9 w-10 shrink-0 cursor-pointer border border-line bg-ink"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} hex value`}
          className={`${fieldClass} font-mono text-[12px]`}
        />
      </span>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border border-line bg-ink px-3.5 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[color:var(--color-signal)]"
      />
      <span>
        <span className="block text-[13px] font-medium text-paper">{label}</span>
        {hint ? <span className="mt-0.5 block font-mono text-[10px] text-dim">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SaveBar({
  busy,
  message,
  error,
  onSave,
  label = "Save changes",
}: {
  busy: boolean;
  message: string | null;
  error: string | null;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
      <button
        onClick={onSave}
        disabled={busy}
        className="inline-flex items-center gap-2 border border-paper/25 bg-paper px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-ink uppercase transition-colors hover:border-signal hover:bg-signal disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {label}
      </button>
      {message ? (
        <p role="status" className="font-mono text-[11px] text-mint">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="font-mono text-[11px] text-crimson">{error}</p>
      ) : null}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-line bg-panel p-5 sm:p-6">
      <p className="mb-4 font-mono text-[10px] tracking-[0.25em] text-signal uppercase">{title}</p>
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: "ACTIVE" | "SUSPENDED" | "ARCHIVED" }) {
  const tone: Record<typeof status, string> = {
    ACTIVE: "border-mint/40 text-mint",
    SUSPENDED: "border-amber/40 text-amber",
    ARCHIVED: "border-line text-dim",
  };
  const glyph: Record<typeof status, string> = {
    ACTIVE: "●",
    SUSPENDED: "❚❚",
    ARCHIVED: "▣",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.18em]", tone[status])}>
      <span aria-hidden="true">{glyph[status]}</span>
      {status}
    </span>
  );
}
