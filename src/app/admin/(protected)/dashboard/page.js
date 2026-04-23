import Link from "next/link";
import { AdminShell } from "@/components/admin-cms/admin-shell";
import { listMedia, listProjects } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [projects, media] = await Promise.all([
    listProjects({ includeUnpublished: true }),
    listMedia(),
  ]);

  const featuredCount = projects.filter((project) => project.featured).length;
  const publishedCount = projects.filter((project) => project.published).length;
  const unpublishedCount = projects.length - publishedCount;

  return (
    <AdminShell title="dashboard" description="Overview of site content and publishing status.">
      <div className="admin-cms-grid">
        <article className="admin-cms-card">
          <h2>projects</h2>
          <p>total: {projects.length}</p>
          <p>featured: {featuredCount}</p>
          <p>published: {publishedCount}</p>
          <p>unpublished: {unpublishedCount}</p>
          <Link href="/admin/projects" className="admin-cms-link">
            manage projects
          </Link>
        </article>

        <article className="admin-cms-card">
          <h2>media library</h2>
          <p>assets: {media.length}</p>
          <Link href="/admin/media" className="admin-cms-link">
            open media
          </Link>
        </article>

        <article className="admin-cms-card">
          <h2>site content</h2>
          <ul>
            <li>
              <Link href="/admin/homepage" className="admin-cms-link">
                homepage
              </Link>
            </li>
            <li>
              <Link href="/admin/about" className="admin-cms-link">
                about
              </Link>
            </li>
            <li>
              <Link href="/admin/contact" className="admin-cms-link">
                contact
              </Link>
            </li>
            <li>
              <Link href="/admin/settings" className="admin-cms-link">
                settings
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </AdminShell>
  );
}
