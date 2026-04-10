import Image from "next/image";
import { getContentStore } from "@/lib/content-store";

export async function generateMetadata() {
  const content = await getContentStore();
  return {
    title: `Moodboard — ${content.site.siteName}`,
  };
}

export default async function MoodboardPage() {
  const content = await getContentStore();
  const pageAlignClass = content.site.textAlign === "right" ? "is-right" : "is-left";

  return (
    <section className={`content-page ${pageAlignClass}`}>
      <header className="section-header">
        <h1>{content.pageHeaders.moodboard.title}</h1>
        <p>{content.pageHeaders.moodboard.description}</p>
      </header>

      <ul className="moodboard-grid">
        {content.moodboardItems.map((entry) => (
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
