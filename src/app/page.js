import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { NycClock } from "@/components/nyc-clock";
import { getContentStore } from "@/lib/content-store";

export default async function HomePage() {
  const content = await getContentStore();

  return (
    <section className="home-page">
      <div className="home-wordmark-wrap">
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

      <nav className="home-directory" aria-label="Main sections">
        <ul>
          {content.homepageLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
