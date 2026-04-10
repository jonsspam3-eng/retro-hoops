import Image from "next/image";
import { moodboardEntries } from "@/data/moodboard";

export const metadata = {
  title: "Moodboard — archive_13",
};

export default function MoodboardPage() {
  return (
    <section className="content-page">
      <header className="section-header">
        <h1>moodboard</h1>
        <p>editorials, textures, references, and found fragments</p>
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
