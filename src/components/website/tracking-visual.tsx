import { PACKAGE_STATUSES, PACKAGE_STATUS_META } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Hero tracking visual — an ILLUSTRATION of the tracking experience, not a
 * real shipment. It shows the platform's actual five-status model with a
 * masked tracking ID and an explicit "Example" label, so it can never be
 * mistaken for a customer's live package data (docs/tenant-websites.md).
 */
export function TrackingVisual() {
  // Illustrative position in the five-stage lifecycle.
  const currentStep = PACKAGE_STATUS_META.IN_TRANSIT.step;

  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-neutral-500">Shipment tracking</p>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-neutral-500 uppercase">
          Example
        </span>
      </div>

      <p className="mt-2 font-mono text-[16px] font-semibold tracking-tight text-neutral-900">
        PKG-••••-••••
      </p>

      <ol className="mt-4">
        {PACKAGE_STATUSES.map((status, index) => {
          const meta = PACKAGE_STATUS_META[status];
          const done = meta.step <= currentStep;
          const isCurrent = meta.step === currentStep;
          const hasMore = index < PACKAGE_STATUSES.length - 1;
          return (
            <li key={status} className="relative flex gap-3 pb-3 last:pb-0">
              <span className="relative flex w-4 shrink-0 justify-center" aria-hidden="true">
                <span
                  className={cn(
                    "z-10 mt-1 h-2.5 w-2.5 rounded-full border-2 bg-white",
                    done ? "border-neutral-800" : "border-neutral-300",
                  )}
                  style={isCurrent ? { backgroundColor: "var(--brand)", borderColor: "var(--brand)" } : undefined}
                />
                {hasMore ? (
                  <span
                    className={cn(
                      "absolute top-3.5 bottom-[-6px] w-px",
                      done ? "bg-neutral-300" : "bg-neutral-200",
                    )}
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "-mt-0.5 text-[13px] leading-5",
                  isCurrent ? "font-semibold text-neutral-900" : done ? "text-neutral-600" : "text-neutral-400",
                )}
              >
                {meta.label}
                {isCurrent ? (
                  <span className="ml-2 text-[10.5px] font-semibold tracking-wide text-neutral-400 uppercase">
                    current
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-black/8 pt-3 text-[11.5px] leading-5 text-neutral-500">
        What you&apos;ll see when you track your package.
      </p>
    </div>
  );
}
