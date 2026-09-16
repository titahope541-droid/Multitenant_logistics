/**
 * Shared UI kit — the single source of visual truth for the PRODUCT
 * surfaces (tenant admin, platform admin, login, and the customer
 * tracking chrome). Presentational only: no data fetching, no hooks, so
 * these compose inside both server and client components.
 *
 * Design system: white cards on a soft canvas, hairline borders, one warm
 * accent, restrained status colors, generous spacing, strong type scale.
 */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACKAGE_STATUS_META, type PackageStatus, type TenantStatus } from "@/types/domain";

/* ── Surfaces ────────────────────────────────────────────────────────────── */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-hair bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hair px-5 py-4 sm:px-6">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-5 py-5 sm:px-6", className)}>{children}</div>;
}

/** Card + header + body in one call, for the common case. */
export function SectionCard({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} description={description} actions={actions} />
      <CardBody className={bodyClassName}>{children}</CardBody>
    </Card>
  );
}

/* ── Page header ─────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[14px] leading-6 text-body">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-55",
    size === "sm" ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2.5 text-[13.5px]",
    variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
    variant === "secondary" &&
      "border border-hair-strong bg-surface text-slate hover:border-muted hover:bg-surface-2",
    variant === "ghost" && "text-body hover:bg-surface-2 hover:text-slate",
    variant === "danger" &&
      "border border-danger/25 bg-danger-soft text-danger hover:border-danger/45",
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(buttonClasses(variant, size), className)}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/* ── Form controls ───────────────────────────────────────────────────────── */

export const inputClasses = cn(
  "w-full rounded-lg border border-hair-strong bg-surface px-3.5 py-2.5 text-[14px] text-slate",
  "placeholder:text-muted/80 transition-colors outline-none",
  "focus:border-accent focus:ring-2 focus:ring-accent/15",
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted",
);

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-medium text-slate">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-[12px] text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-1.5 text-[12px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClasses, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClasses, "resize-y", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClasses, "pr-9", props.className)} />;
}

/* ── Status badges ───────────────────────────────────────────────────────── */

const PACKAGE_TONES: Record<PackageStatus, string> = {
  PENDING: "bg-surface-2 text-body ring-hair-strong",
  PROCESSED: "bg-warn-soft text-warn ring-warn/20",
  IN_TRANSIT: "bg-info-soft text-info ring-info/20",
  ARRIVED_AT_FACILITY: "bg-violet-soft text-violet ring-violet/20",
  DELIVERED: "bg-slate text-white ring-slate/20",
};

/** Package status chip — always label + dot, never color alone. */
export function StatusBadge({
  status,
  withStep = false,
  className,
}: {
  status: PackageStatus;
  withStep?: boolean;
  className?: string;
}) {
  const meta = PACKAGE_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ring-inset",
        PACKAGE_TONES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {meta.label}
      {withStep ? <span className="opacity-60">· {meta.step}/5</span> : null}
    </span>
  );
}

const TENANT_TONES: Record<TenantStatus, string> = {
  ACTIVE: "bg-ok-soft text-ok ring-ok/20",
  SUSPENDED: "bg-warn-soft text-warn ring-warn/20",
  ARCHIVED: "bg-surface-2 text-muted ring-hair-strong",
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ring-inset",
        TENANT_TONES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

/* ── Stats ───────────────────────────────────────────────────────────────── */

export type StatTone = "neutral" | "accent" | "info" | "ok" | "warn";

const STAT_TONES: Record<StatTone, string> = {
  neutral: "bg-surface-2 text-body",
  accent: "bg-accent-soft text-accent",
  info: "bg-info-soft text-info",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted">{label}</p>
        {icon ? (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", STAT_TONES[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.02em] text-slate">
        {value}
      </p>
      {hint ? <p className="mt-2 text-[12px] text-muted">{hint}</p> : null}
    </Card>
  );
}

/* ── States ──────────────────────────────────────────────────────────────── */

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-12 text-[13.5px] text-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span role="status">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Inbox className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-slate">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-6 text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-[13px] leading-5 text-danger"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-ok/20 bg-ok-soft px-3.5 py-2.5 text-[13px] leading-5 text-ok"
    >
      {children}
    </p>
  );
}

/* ── Table primitives (shared by package + tenant lists) ─────────────────── */

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13.5px]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-hair bg-surface-2 px-5 py-3 text-[11.5px] font-semibold tracking-wide text-muted uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-hair px-5 py-3.5 align-middle", className)}>{children}</td>;
}

/** Monospace identifier (tracking IDs, coordinates). */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px] tracking-tight", className)}>{children}</span>;
}
