"use client";

/**
 * Platform-admin form primitives — thin wrappers over the shared UI kit so
 * the website/branding editors stay consistent with the rest of the
 * product (labels bound to controls, visible focus, accessible errors).
 */

import type { ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorNote,
  Field,
  Input,
  Select,
  SuccessNote,
  TenantStatusBadge,
  Textarea,
  inputClasses,
} from "@/components/ui";

export { inputClasses as fieldClass, Field, Input, Select, Textarea };
export const StatusPill = TenantStatusBadge;

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[12.5px] font-medium text-slate">{children}</span>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
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
      <Textarea
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
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
          className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-hair-strong bg-surface p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} hex value`}
          className="font-mono text-[13px]"
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
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hair bg-surface px-3.5 py-3 transition-colors hover:border-hair-strong">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[color:var(--color-accent)]"
      />
      <span>
        <span className="block text-[13.5px] font-medium text-slate">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] text-muted">{hint}</span> : null}
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
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-xl border border-hair bg-surface/95 px-4 py-3 shadow-[var(--shadow-raised)] backdrop-blur">
      <Button variant="primary" onClick={onSave} loading={busy}>
        {label}
      </Button>
      {message ? <SuccessNote>{message}</SuccessNote> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}
