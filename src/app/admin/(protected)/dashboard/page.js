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
  const recentProjects = projects.slice(0, 5);
  const recentMedia = media.slice(0, 5);

  return (
    <AdminShell title="dashboard" description="Overview of portfolio content and publishing status.">
      <div className="admin-cms-stack">
        <div className="admin-cms-grid admin-cms-grid-tight">
          <article className="admin-cms-card admin-cms-card-stat">
            <h2>projects</h2>
            <p className="admin-stat-number">{projects.length}</p>
            <small>
              {publishedCount} published / {unpublishedCount} draft / {featuredCount} featured
            </small>
            <Link href="/admin/projects" className="admin-cms-link">
              manage projects
            </Link>
          </article>

          <article className="admin-cms-card admin-cms-card-stat">
            <h2>media assets</h2>
            <p className="admin-stat-number">{media.length}</p>
            <small>library, photography, and moodboard collections</small>
            <Link href="/admin/media" className="admin-cms-link">
              open media library
            </Link>
          </article>

          <article className="admin-cms-card admin-cms-card-stat">
            <h2>site content</h2>
            <small>homepage, about, contact, and global settings</small>
            <ul className="admin-inline-links">
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

        <div className="admin-cms-grid admin-cms-grid-wide">
          <article className="admin-cms-card">
            <h2>recent projects</h2>
            <ul className="admin-simple-list">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <span>{project.title}</span>
                  <small>{project.published ? "published" : "draft"}</small>
                </li>
              ))}
            </ul>
          </article>

          <article className="admin-cms-card">
            <h2>recent media</h2>
            <ul className="admin-simple-list">
              {recentMedia.map((item) => (
                <li key={item.id}>
                  <span>{item.title}</span>
                  <small>{item.collection.toLowerCase()}</small>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </AdminShell>
  );
}
