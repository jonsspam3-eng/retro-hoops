import { AdminShell } from "@/components/admin-cms/admin-shell";
import { MediaForm } from "@/components/admin-cms/media-form";
import { listMedia } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const media = await listMedia();
  const initialItems = media.map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    publicId: item.publicId || "",
    altText: item.altText || "",
    collection: item.collection || "LIBRARY",
    category: item.category || "",
    year: item.year || "",
    location: item.location || "",
    moodType: item.moodType || "",
    sortOrder: item.sortOrder || 0,
    featured: Boolean(item.featured),
    published: Boolean(item.published),
  }));

  return (
    <AdminShell title="media" description="Upload, tag, reuse, and reorder assets.">
      <MediaForm initialItems={initialItems} />
    </AdminShell>
  );
}
