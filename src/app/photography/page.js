import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { PhotographyArchive } from "@/components/photography-archive";
import { getContentStore } from "@/lib/content-store";

export async function generateMetadata() {
  const content = await getContentStore();
  return {
    title: `Photography — ${content.site.siteName}`,
  };
}

export default async function PhotographyPage() {
  const content = await getContentStore();

  return (
    <section className="content-page">
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
