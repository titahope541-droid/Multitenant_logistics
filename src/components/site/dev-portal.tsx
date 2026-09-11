import { Hero } from "@/components/site/hero";
import { Ticker } from "@/components/site/ticker";
import { StatusStrip } from "@/components/site/status-strip";
import { Architecture } from "@/components/site/architecture";
import { Tenancy } from "@/components/site/tenancy";
import { Charter } from "@/components/site/charter";
import { Roadmap } from "@/components/site/roadmap";
import { DocsGrid } from "@/components/site/docs-grid";

/**
 * The platform developer portal — what the ROOT of the platform domain
 * (and plain localhost) renders. Tenant subdomains render their own
 * config-driven websites instead (docs/tenant-websites.md).
 */
export function DevPortal() {
  return (
    <main>
      <Hero />
      <Ticker />
      <StatusStrip />
      <Architecture />
      <Tenancy />
      <Charter />
      <Roadmap />
      <DocsGrid />
    </main>
  );
}
