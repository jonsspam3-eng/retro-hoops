import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { PhotographyArchive } from "@/components/photography-archive";
import { brandConfig } from "@/data/brand-config";
import {
  photographyCategories,
  photographyEntries,
} from "@/data/photography";
import { siteContent } from "@/data/site-content";

export const metadata = {
  title: `Photography — ${brandConfig.siteName}`,
};

export default function PhotographyPage() {
  return (
    <section className="content-page">
      <header className="section-header">
        <h1>{siteContent.pageHeaders.photography.title}</h1>
        <p>{siteContent.pageHeaders.photography.description}</p>
      </header>

      <PhotographyArchive
        entries={photographyEntries}
        categories={photographyCategories}
      />

      <ArchiveBottomLinks />
    </section>
  );
}
