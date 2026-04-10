import { getContentStore } from "@/lib/content-store";

export async function generateMetadata() {
  const content = await getContentStore();
  return {
    title: `About — ${content.site.siteName}`,
  };
}

export default async function AboutPage() {
  const content = await getContentStore();
  const textAlignClass = content.site.textAlign === "right" ? "text-right" : "text-left";

  return (
    <section className={`content-page prose-page ${textAlignClass}`}>
      <header className="section-header">
        <h1>{content.pageHeaders.about.title}</h1>
      </header>

      {content.about.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      {content.about.sections.map((section) => (
        <div className="about-block" key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </div>
      ))}
    </section>
  );
}
