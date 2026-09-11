import { PACKAGE_STATUS_META, type PackageStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<PackageStatusMeta["tone"], string> = {
  idle: "border-line text-dim",
  active: "border-amber/40 text-amber",
  moving: "border-signal/50 text-signal",
  hub: "border-amber/40 text-amber",
  done: "border-mint/40 text-mint",
};

type PackageStatusMeta = (typeof PACKAGE_STATUS_META)[PackageStatus];

/** Status pill — always label + step indicator, never color alone. */
export function StatusBadge({ status, withStep = false }: { status: PackageStatus; withStep?: boolean }) {
  const meta = PACKAGE_STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-2 border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.15em]", TONE_CLASSES[meta.tone])}>
      <span className="h-1 w-1 bg-current" />
      {meta.label.toUpperCase()}
      {withStep ? <span className="text-dim">{meta.step}/5</span> : null}
    </span>
  );
}
