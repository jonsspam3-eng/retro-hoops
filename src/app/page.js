import Link from "next/link";
import { NycClock } from "@/components/nyc-clock";
import { primaryLinks } from "@/data/navigation";

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="home-wordmark-wrap">
        {/* Replace this text logo with your own name or wordmark. */}
        <h1 className="home-wordmark">archive_13</h1>
        <NycClock />
      </div>

      <nav className="home-directory" aria-label="Main sections">
        <ul>
          {primaryLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
