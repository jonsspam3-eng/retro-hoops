import Image from "next/image";
import Link from "next/link";
import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { getPublicContent } from "@/lib/cms";

export async function generateMetadata() {
  const content = await getPublicContent();
  return {
    title: `Projects — ${content.site.siteName}`,
  };
}

export default async function ProjectsPage() {
  const content = await getPublicContent();
  const pageAlignClass = `align-${content.site.textAlign ?? "left"}`;

  return (
    <section className={`content-page ${pageAlignClass}`}>
      <header className="section-header">
        <h1>{content.pageHeaders.projects.title}</h1>
        <p>{content.pageHeaders.projects.description}</p>
      </header>

      <ul className="project-grid">
        {content.projects.map((project) => (
          <li key={project.slug}>
            <Link href={`/projects/${project.slug}`} className="project-card">
              <Image
                src={project.thumbnail}
                alt={project.title}
                width={1100}
                height={900}
              />
              <span>{project.title}</span>
              <small>
                {project.category}
              </small>
            </Link>
          </li>
        ))}
      </ul>

      <ArchiveBottomLinks links={content.archiveBottomLinks} />
    </section>
  );
}
