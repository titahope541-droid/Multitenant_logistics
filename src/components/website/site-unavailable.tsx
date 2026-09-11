import { CloudOff } from "lucide-react";

export type UnavailableReason = "unavailable" | "not-found" | "error";

const COPY: Record<UnavailableReason, { title: string; lead: string; foot: string }> = {
  unavailable: {
    title: "Website Temporarily Unavailable",
    lead: "This website is temporarily unavailable. Please check back later.",
    foot: "The operators have been notified of every render path reaching this page.",
  },
  "not-found": {
    title: "Website Not Found",
    lead: "No website exists at this address. Check the URL and try again.",
    foot: "If you followed a link, it may be outdated.",
  },
  error: {
    title: "Something Went Wrong",
    lead: "We could not load this website right now. Please retry in a moment.",
    foot: "If the problem persists, the site operator will look into it.",
  },
};

/**
 * Generic failure surface for tenant websites — deliberately reveals
 * nothing: no branding, no contact, no package data, no internals.
 */
export function SiteUnavailable({ reason }: { reason: UnavailableReason }) {
  const copy = COPY[reason];
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5">
      <div className="max-w-md text-center">
        <CloudOff className="mx-auto h-10 w-10 text-dim" strokeWidth={1.25} />
        <h1 className="mt-6 text-2xl font-bold tracking-[-0.01em] text-paper sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-fog">{copy.lead}</p>
        <p className="mt-8 font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
          {copy.foot}
        </p>
      </div>
    </main>
  );
}
