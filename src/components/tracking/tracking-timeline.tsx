import { PACKAGE_STATUSES, PACKAGE_STATUS_META, type PublicTrackingResult } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Status timeline — recorded events in order (current = latest event),
 * with remaining lifecycle steps shown as upcoming. Accessible beyond
 * color: every node carries its label and its step position.
 */
export function TrackingTimeline({ result }: { result: PublicTrackingResult }) {
  const reached = new Set(result.timeline.map((event) => event.status));
  const currentStatus = result.status;
  const currentStep = PACKAGE_STATUS_META[currentStatus].step;
  const upcoming = PACKAGE_STATUSES.filter((status) => !reached.has(status));

  return (
    <ol className="mt-5 space-y-0">
      {result.timeline.map((event, index) => {
        const isCurrent = index === result.timeline.length - 1;
        const meta = PACKAGE_STATUS_META[event.status];
        return (
          <li key={`${event.occurredAt}-${index}`} className="relative pb-6 pl-8 last:pb-0">
            <span
              aria-hidden="true"
              className="absolute top-1 left-0 flex h-4 w-4 items-center justify-center rounded-full border-2"
              style={{ borderColor: "var(--brand)", backgroundColor: isCurrent ? "var(--brand)" : "#fff" }}
            >
              {!isCurrent ? <span className="h-1 w-1 rounded-full" style={{ backgroundColor: "var(--brand)" }} /> : null}
            </span>
            {index !== result.timeline.length - 1 || upcoming.length > 0 ? (
              <span aria-hidden="true" className="absolute top-4 bottom-0 left-[7px] w-px bg-black/10" />
            ) : null}
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className={cn("text-[14px] font-semibold", isCurrent ? "text-neutral-900" : "text-neutral-700")}>
                {meta.label}
                {isCurrent ? <span className="ml-2 text-[10px] font-medium tracking-[0.15em] text-neutral-400 uppercase">current</span> : null}
              </span>
              <span className="font-mono text-[11px] text-neutral-400">
                step {meta.step}/5 · {new Date(event.occurredAt).toLocaleString()}
              </span>
            </div>
            {event.note ? <p className="mt-0.5 text-[12.5px] leading-5 text-neutral-500">{event.note}</p> : null}
          </li>
        );
      })}
      {currentStep < 5 || upcoming.length > 0
        ? upcoming.map((status) => (
            <li key={status} className="relative pb-6 pl-8 opacity-45 last:pb-0">
              <span aria-hidden="true" className="absolute top-1 left-0 h-4 w-4 rounded-full border-2 border-dashed border-neutral-300 bg-white" />
              <span className="text-[14px] font-medium text-neutral-500">{PACKAGE_STATUS_META[status].label}</span>
              <span className="ml-3 font-mono text-[11px] text-neutral-400">step {PACKAGE_STATUS_META[status].step}/5 · upcoming</span>
            </li>
          ))
        : null}
    </ol>
  );
}
