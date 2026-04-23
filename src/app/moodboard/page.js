import { FadeImage } from "@/components/fade-image";
import { getPublicContent } from "@/lib/cms";

export async function generateMetadata() {
  const content = await getPublicContent();
  return {
    title: `Moodboard — ${content.site.siteName}`,
  };
}

export default async function MoodboardPage() {
  const content = await getPublicContent();
  const pageAlignClass = `align-${content.site.textAlign ?? "left"}`;

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
              <FadeImage
                src={entry.image}
                alt={entry.title}
                width={1200}
                height={1200}
                sizes="(max-width: 900px) 50vw, 24vw"
                imageClassName="mood-image"
              />
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
