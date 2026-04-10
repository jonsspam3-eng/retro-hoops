import Image from "next/image";
import Link from "next/link";
import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { getContentStore } from "@/lib/content-store";

export async function generateMetadata() {
  const content = await getContentStore();
  return {
    title: `Projects — ${content.site.siteName}`,
  };
}

export default async function ProjectsPage() {
  const content = await getContentStore();

  return (
    <section className="content-page">
      <header className="section-header">
        <h1>{content.pageHeaders.projects.title}</h1>
        <p>{content.pageHeaders.projects.description}</p>
      </header>

      <ul className="project-grid">
        {content.projects.map((project) => (
          <li key={project.slug}>
            <Link href={`/projects/${project.slug}`} className="project-card">
              {/* Replace image paths from /admin or src/data/content-store.json. */}
              <Image
                src={project.image}
                alt={project.title}
                width={1100}
                height={900}
              />
              <span>{project.title}</span>
              <small>
                {project.discipline} / {project.year}
              </small>
            </Link>
          </li>
        ))}
      </ul>

      <ArchiveBottomLinks links={content.archiveBottomLinks} />
    </section>
  );
}
