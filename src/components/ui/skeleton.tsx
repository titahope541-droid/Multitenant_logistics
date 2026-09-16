import { cn } from "@/lib/utils";

/** Restrained loading placeholder (respects reduced-motion via globals). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

/** Table-shaped skeleton for list pages. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 px-5 py-5 sm:px-6">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-4 flex-1", columnIndex === 0 && "max-w-[220px]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card-shaped skeleton for stat rows. */
export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-hair bg-surface p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
