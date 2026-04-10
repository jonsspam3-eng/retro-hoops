import { brandConfig } from "@/data/brand-config";
import { siteContent } from "@/data/site-content";

export const metadata = {
  title: `About — ${brandConfig.siteName}`,
};

export default function AboutPage() {
  return (
    <section className="content-page prose-page">
      <header className="section-header">
        <h1>{siteContent.pageHeaders.about.title}</h1>
      </header>

      {siteContent.about.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      {siteContent.about.sections.map((section) => (
        <div className="about-block" key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </div>
      ))}
    </section>
  );
}
