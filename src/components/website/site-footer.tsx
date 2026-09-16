import Link from "next/link";
import type { PublicWebsiteData } from "@/types/website";

/**
 * Tenant footer — company identity, configured description, navigation,
 * contact and social links. No platform branding, no admin links.
 */
export function SiteFooter({ data }: { data: PublicWebsiteData }) {
  const { footer } = data.sections;
  if (!footer.enabled) return null;

  const navItems = data.navigation.filter((item) => item.visible);

  return (
    <footer style={{ backgroundColor: "var(--brand-ink)" }}>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2.5">
              {data.branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.branding.logoUrl}
                  alt={`${data.companyName} logo`}
                  className="h-8 w-auto"
                />
              ) : (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-semibold text-white"
                  style={{ backgroundColor: "var(--brand)" }}
                >
                  {data.companyName.charAt(0)}
                </span>
              )}
              <span className="text-[16px] font-semibold tracking-[-0.01em] text-white">
                {data.companyName}
              </span>
            </div>
            <p className="mt-4 max-w-sm text-[13.5px] leading-6 text-white/60">
              {footer.text ??
                data.branding.tagline ??
                "Reliable logistics with package tracking you can follow."}
            </p>
          </div>

          {/* Navigation */}
          {footer.showNavigation && navItems.length > 0 ? (
            <nav aria-label="Footer">
              <p className="text-[12px] font-semibold tracking-[0.14em] text-white/45 uppercase">
                Navigate
              </p>
              <ul className="mt-4 space-y-2.5">
                {navItems.map((item) => (
                  <li key={item.label + item.href}>
                    {item.href.startsWith("/") ? (
                      <Link
                        href={item.href}
                        className="text-[13.5px] text-white/75 transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-[13.5px] text-white/75 transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* Contact + social */}
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-white/45 uppercase">
              Reach us
            </p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-white/75">
              {data.contact.phone ? (
                <li>
                  <a
                    href={`tel:${data.contact.phone.replace(/[^+\d]/g, "")}`}
                    className="transition-colors hover:text-white"
                  >
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
              {data.contact.address ? (
                <li className="leading-6">{data.contact.address}</li>
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

        <div className="mt-12 border-t border-white/10 pt-6 text-[12.5px] text-white/45">
          © {new Date().getFullYear()} {data.companyName}
        </div>
      </div>
    </footer>
  );
}
