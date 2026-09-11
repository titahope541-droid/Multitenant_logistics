import type { ReactNode } from "react";

/** Shared section header — keeps hierarchy consistent across the portal. */
export function SectionHeading({
  index,
  eyebrow,
  title,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-12 grid gap-8 sm:mb-16 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-end">
      <div>
        <p className="mb-4 flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
          <span className="text-dim">{index}</span>
          <span className="h-px w-8 bg-line-strong" />
          {eyebrow}
        </p>
        <h2 className="max-w-2xl text-3xl font-bold tracking-[-0.02em] text-paper sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
          {title}
        </h2>
      </div>
      {children ? <div className="text-sm leading-6 text-fog">{children}</div> : null}
    </div>
  );
}
