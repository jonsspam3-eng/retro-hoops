import Image from "next/image";
import Link from "next/link";
import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { brandConfig } from "@/data/brand-config";
import { projects } from "@/data/projects";
import { siteContent } from "@/data/site-content";

export const metadata = {
  title: `Projects — ${brandConfig.siteName}`,
};

export default function ProjectsPage() {
  return (
    <section className="content-page">
      <header className="section-header">
        <h1>{siteContent.pageHeaders.projects.title}</h1>
        <p>{siteContent.pageHeaders.projects.description}</p>
      </header>

      <ul className="project-grid">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link href={`/projects/${project.slug}`} className="project-card">
              {/* Replace image paths in src/data/projects.js with real project visuals. */}
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

      <ArchiveBottomLinks />
    </section>
  );
}
