import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { PhotographyArchive } from "@/components/photography-archive";
import { getPublicContent } from "@/lib/cms";

export async function generateMetadata() {
  const content = await getPublicContent();
  return {
    title: `Photography — ${content.site.siteName}`,
  };
}

export default async function PhotographyPage() {
  const content = await getPublicContent();
  const alignClass = `align-${content.site.textAlign ?? "left"}`;

  return (
    <section className={`content-page ${alignClass}`}>
      <header className="section-header">
        <h1>{content.pageHeaders.photography.title}</h1>
        <p>{content.pageHeaders.photography.description}</p>
      </header>

      <PhotographyArchive
        entries={content.photographyItems}
        categories={content.photographyCategories}
      />

      <ArchiveBottomLinks links={content.archiveBottomLinks} />
    </section>
  );
}
