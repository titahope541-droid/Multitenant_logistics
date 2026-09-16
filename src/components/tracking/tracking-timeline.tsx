import { PACKAGE_STATUSES, PACKAGE_STATUS_META, type PublicTrackingResult } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Customer status timeline — recorded events in order (the latest is the
 * current one), with the remaining lifecycle shown as upcoming steps.
 * Readable without color: each node states its label and position.
 */
export function TrackingTimeline({ result }: { result: PublicTrackingResult }) {
  const reached = new Set(result.timeline.map((event) => event.status));
  const upcoming = PACKAGE_STATUSES.filter((status) => !reached.has(status));

  return (
    <ol className="relative">
      {result.timeline.map((event, index) => {
        const isCurrent = index === result.timeline.length - 1;
        const meta = PACKAGE_STATUS_META[event.status];
        const hasMore = index < result.timeline.length - 1 || upcoming.length > 0;
        return (
          <li key={`${event.occurredAt}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
            <span className="relative flex w-5 shrink-0 justify-center" aria-hidden="true">
              <span
                className={cn(
                  "z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 bg-white",
                  isCurrent ? "border-[color:var(--brand)]" : "border-neutral-300",
                )}
                style={isCurrent ? { backgroundColor: "var(--brand)" } : undefined}
              />
              {hasMore ? (
                <span className="absolute top-5 bottom-[-8px] w-px bg-neutral-200" />
              ) : null}
            </span>

            <div className="-mt-0.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className={cn(
                    "text-[14.5px] font-semibold",
                    isCurrent ? "text-neutral-900" : "text-neutral-700",
                  )}
                >
                  {meta.label}
                </span>
                {isCurrent ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase"
                    style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
                  >
                    Current
                  </span>
                ) : null}
                <span className="text-[12.5px] text-neutral-500">
                  {new Date(event.occurredAt).toLocaleString()}
                </span>
              </div>
              {event.note ? (
                <p className="mt-1 text-[13px] leading-5 text-neutral-500">{event.note}</p>
              ) : null}
            </div>
          </li>
        );
      })}

      {upcoming.map((status, index) => (
        <li key={status} className="relative flex gap-4 pb-6 last:pb-0 opacity-50">
          <span className="relative flex w-5 shrink-0 justify-center" aria-hidden="true">
            <span className="z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 border-dashed border-neutral-300 bg-white" />
            {index < upcoming.length - 1 ? (
              <span className="absolute top-5 bottom-[-8px] w-px bg-neutral-200" />
            ) : null}
          </span>
          <div className="-mt-0.5">
            <span className="text-[14.5px] font-medium text-neutral-600">
              {PACKAGE_STATUS_META[status].label}
            </span>
            <span className="ml-2 text-[12.5px] text-neutral-400">Upcoming</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
