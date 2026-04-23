import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { NycClock } from "@/components/nyc-clock";
import { getPublicContent } from "@/lib/cms";

export default async function HomePage() {
  const content = await getPublicContent();
  const homeAlignClass =
    content.site.homeTextAlign === "right"
      ? "is-align-right"
      : content.site.homeTextAlign === "left"
        ? "is-align-left"
        : "is-align-center";

  return (
    <section className={`home-page ${homeAlignClass}`}>
      <div className={`home-wordmark-wrap ${homeAlignClass}`}>
        <h1 className="home-wordmark">
          <LogoMark
            className="home-logo"
            altSuffix="logo"
            logoPath={content.site.logoPath}
            siteName={content.site.siteName}
          />
        </h1>
        <NycClock locationLabel={content.site.locationLabel} />
      </div>

      <nav className={`home-directory ${homeAlignClass}`} aria-label="Main sections">
        <ul>
          {content.homepageLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} prefetch>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
