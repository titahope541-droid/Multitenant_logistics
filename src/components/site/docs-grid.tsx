import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { DOC_ENTRIES } from "@/lib/docs";

export function DocsGrid() {
  return (
    <section id="docs" className="scroll-mt-16 border-b border-line">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading index="05" eyebrow="Documentation" title="The contracts every phase obeys.">
          Documentation is a core deliverable, not an afterthought. Written
          for the next developer, for the operator learning this stack, and
          for the tools that build on it — always in sync with the code.
        </SectionHeading>

        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {DOC_ENTRIES.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="group relative flex min-h-44 flex-col justify-between bg-ink p-6 transition-colors hover:bg-panel"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] text-dim">
                  {String(doc.order).padStart(2, "0")}
                </span>
                <ArrowUpRight className="h-4 w-4 text-dim transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-signal" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-paper">{doc.title}</h3>
                <p className="mt-2 text-[13px] leading-5 text-fog">{doc.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 font-mono text-[10.5px] tracking-[0.15em] text-dim uppercase">
          Sources of truth live in /docs — rendered here for reading.
        </p>
      </div>
    </section>
  );
}
