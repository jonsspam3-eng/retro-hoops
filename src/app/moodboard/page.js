import Image from "next/image";
import { brandConfig } from "@/data/brand-config";
import { moodboardEntries } from "@/data/moodboard";
import { siteContent } from "@/data/site-content";

export const metadata = {
  title: `Moodboard — ${brandConfig.siteName}`,
};

export default function MoodboardPage() {
  return (
    <section className="content-page">
      <header className="section-header">
        <h1>{siteContent.pageHeaders.moodboard.title}</h1>
        <p>{siteContent.pageHeaders.moodboard.description}</p>
      </header>

      <ul className="moodboard-grid">
        {moodboardEntries.map((entry) => (
          <li key={entry.id}>
            <article className="mood-card">
              <Image src={entry.image} alt={entry.title} width={1200} height={1200} />
              <div className="mood-caption">
                <span>{entry.title}</span>
                <small>{entry.type}</small>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
