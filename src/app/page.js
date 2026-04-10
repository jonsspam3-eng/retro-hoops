import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { NycClock } from "@/components/nyc-clock";
import { siteContent } from "@/data/site-content";

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="home-wordmark-wrap">
        <h1 className="home-wordmark">
          <LogoMark className="home-logo" altSuffix="logo" />
        </h1>
        <NycClock locationLabel={siteContent.locationLabel} />
      </div>

      <nav className="home-directory" aria-label="Main sections">
        <ul>
          {siteContent.homepageLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
