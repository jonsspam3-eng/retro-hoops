import { AdminEditor } from "@/components/admin/admin-editor";
import {
  getContentStore,
  isLocalAdminEnabled,
} from "@/lib/content-store";

export const metadata = {
  title: "Admin Editor",
};

export default async function AdminPage() {
  if (!isLocalAdminEnabled()) {
    return (
      <section className="content-page prose-page">
        <header className="section-header">
          <h1>admin</h1>
        </header>
        <p>The local admin editor is disabled in this environment.</p>
      </section>
    );
  }

  const content = await getContentStore();

  return (
    <section className="content-page admin-page">
      <header className="section-header">
        <h1>admin</h1>
        <p>Local editor for content and media paths.</p>
      </header>

      <AdminEditor initialContent={content} />
    </section>
  );
}
