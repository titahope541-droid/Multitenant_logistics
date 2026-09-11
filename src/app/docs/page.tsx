import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { DOC_ENTRIES } from "@/lib/docs";
import { PLATFORM } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Documentation",
  description: `The complete ${PLATFORM.name} documentation set — architecture, frontend, backend, database, API, security, environment, development, and the implementation roadmap.`,
};

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto max-w-4xl px-5 pt-28 pb-12 sm:px-8">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-dim uppercase transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-3 w-3" /> Back to portal
          </Link>
          <p className="flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
            <BookOpen className="h-3.5 w-3.5" />
            {PLATFORM.codename} · Documentation
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.02em] text-paper sm:text-5xl">
            Read the system before you build it.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-fog">
            Twenty-five documents define how this platform works and why. They are
            binding: implementation follows the docs, and docs change in the
            same commit as the code that changes behaviour.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
        <ol className="divide-y divide-line border-b border-line">
          {DOC_ENTRIES.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/docs/${doc.slug}`}
                className="group grid gap-2 py-6 transition-colors hover:bg-panel sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:px-4"
              >
                <span className="font-mono text-[11px] text-dim">
                  DOC {String(doc.order).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-lg font-semibold text-paper transition-colors group-hover:text-signal">
                    {doc.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-fog">
                    {doc.description}
                  </span>
                </span>
                <ArrowUpRight className="hidden h-4 w-4 self-center text-dim transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-signal sm:block" />
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-8 font-mono text-[10.5px] leading-6 tracking-[0.1em] text-dim uppercase">
          Canonical sources: /docs/*.md in the repository · rendered here for reading.
        </p>
      </main>
    </div>
  );
}
