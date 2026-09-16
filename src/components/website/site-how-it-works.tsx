import type { PublicWebsiteData } from "@/types/website";

/**
 * How it works — numbered customer-facing steps describing the REAL tracking
 * experience (ID → tracking page → status/location). Steps come from
 * WebsiteConfig; defaults are accurate platform copy, not marketing claims.
 */
export function SiteHowItWorks({ data }: { data: PublicWebsiteData }) {
  const { howItWorks } = data.sections;
  if (!howItWorks.enabled || howItWorks.steps.length === 0) return null;

  return (
    <section id="how-it-works" className="border-b border-black/8 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p
          className="text-[12px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: "var(--brand)" }}
        >
          How it works
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.025em] text-neutral-900 sm:text-4xl">
          {howItWorks.title}
        </h2>

        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {howItWorks.steps.map((step, index) => (
            <li
              key={`${step.title}-${index}`}
              className="rounded-2xl border border-black/8 bg-white p-6 shadow-sm"
            >
              <span
                className="text-[13px] font-bold tracking-wide"
                style={{ color: "var(--brand)" }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-[16px] font-semibold text-neutral-900">{step.title}</h3>
              {step.description ? (
                <p className="mt-2 text-[14px] leading-6 text-neutral-600">{step.description}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
