import Link from "next/link";
import type { PublicWebsiteData } from "@/types/website";

/** Tenant footer — configured text, optional nav/social columns. */
export function SiteFooter({ data }: { data: PublicWebsiteData }) {
  const { footer } = data.sections;
  if (!footer.enabled) return null;

  const navItems = data.navigation.filter((item) => item.visible);

  return (
    <footer style={{ backgroundColor: "var(--brand-ink)" }}>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="text-lg font-bold tracking-tight text-white">{data.companyName}</p>
            <p className="mt-2 max-w-xs text-[13px] leading-6 text-white/60">
              {footer.text ?? data.branding.tagline ?? "Reliable logistics, tracked end to end."}
            </p>
          </div>

          {footer.showNavigation && navItems.length > 0 ? (
            <nav aria-label="Footer">
              <p className="text-[11px] font-semibold tracking-[0.25em] text-white/40 uppercase">Navigate</p>
              <ul className="mt-4 space-y-2.5">
                {navItems.map((item) => (
                  <li key={item.label + item.href}>
                    {item.href.startsWith("/") ? (
                      <Link href={item.href} className="text-[13px] text-white/75 transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    ) : (
                      <a href={item.href} className="text-[13px] text-white/75 transition-colors hover:text-white">
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-white/40 uppercase">Reach us</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/75">
              {data.contact.phone ? (
                <li>
                  <a href={`tel:${data.contact.phone.replace(/[^+\d]/g, "")}`} className="transition-colors hover:text-white">
                    {data.contact.phone}
                  </a>
                </li>
              ) : null}
              {data.contact.email ? (
                <li>
                  <a href={`mailto:${data.contact.email}`} className="transition-colors hover:text-white">
                    {data.contact.email}
                  </a>
                </li>
              ) : null}
              {footer.showSocial
                ? data.socialLinks.map((link) => (
                    <li key={link.platform + link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-white"
                      >
                        {link.platform}
                      </a>
                    </li>
                  ))
                : null}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-[11px] tracking-[0.18em] text-white/40 uppercase">
          © {new Date().getFullYear()} {data.companyName}
        </div>
      </div>
    </footer>
  );
}
