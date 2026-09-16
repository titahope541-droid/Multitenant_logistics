import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { DOC_ENTRIES, getDocBySlug } from "@/lib/docs";
import { PLATFORM } from "@/lib/constants";

type PageParams = { slug: string };

/** Pre-render every registered document at build time. */
export function generateStaticParams(): PageParams[] {
  return DOC_ENTRIES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return { title: "Document not found" };
  return {
    title: `${doc.entry.title} — Docs`,
    description: doc.entry.description,
  };
}

export default async function DocPage({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-5 pt-28 pb-10 sm:px-8">
          <Link
            href="/docs"
            className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-dim uppercase transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-3 w-3" /> All documents
          </Link>
          <p className="font-mono text-[10px] tracking-[0.3em] text-signal uppercase">
            {PLATFORM.codename} · DOC {String(doc.entry.order).padStart(2, "0")} /{" "}
            {String(doc.total).padStart(2, "0")}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.02em] text-paper sm:text-5xl">
            {doc.entry.title}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-fog">{doc.entry.description}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-4 pb-16 sm:px-8">
        <Markdown content={doc.content} />
      </main>

      <nav
        aria-label="Document pagination"
        className="border-t border-line"
      >
        <div className="mx-auto grid max-w-3xl gap-px sm:grid-cols-2">
          {doc.prev ? (
            <Link
              href={`/docs/${doc.prev.slug}`}
              className="group flex items-center gap-3 px-5 py-6 transition-colors hover:bg-panel sm:px-8"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-dim transition-colors group-hover:text-signal" />
              <span>
                <span className="block font-mono text-[9.5px] tracking-[0.25em] text-dim uppercase">
                  Previous
                </span>
                <span className="text-sm font-semibold text-paper">{doc.prev.title}</span>
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {doc.next ? (
            <Link
              href={`/docs/${doc.next.slug}`}
              className="group flex items-center justify-end gap-3 px-5 py-6 text-right transition-colors hover:bg-panel sm:px-8"
            >
              <span>
                <span className="block font-mono text-[9.5px] tracking-[0.25em] text-dim uppercase">
                  Next
                </span>
                <span className="text-sm font-semibold text-paper">{doc.next.title}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-dim transition-colors group-hover:text-signal" />
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
