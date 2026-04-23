import { getPublicContent } from "@/lib/cms";

export async function generateMetadata() {
  const content = await getPublicContent();
  return {
    title: `About — ${content.site.siteName}`,
  };
}

export default async function AboutPage() {
  const content = await getPublicContent();
  const textAlignClass = `align-${content.site.textAlign ?? "left"}`;

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
