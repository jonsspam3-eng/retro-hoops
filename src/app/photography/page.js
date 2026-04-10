import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { PhotographyArchive } from "@/components/photography-archive";
import {
  photographyCategories,
  photographyEntries,
} from "@/data/photography";

export const metadata = {
  title: "Photography — archive_13",
};

export default function PhotographyPage() {
  return (
    <section className="content-page">
      <header className="section-header">
        <h1>photography</h1>
        <p>selected frames / ongoing visual archive</p>
      </header>

      <PhotographyArchive
        entries={photographyEntries}
        categories={photographyCategories}
      />

      <ArchiveBottomLinks />
    </section>
  );
}
