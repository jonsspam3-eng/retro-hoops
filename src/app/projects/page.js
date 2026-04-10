import Image from "next/image";
import Link from "next/link";
import { ArchiveBottomLinks } from "@/components/archive-bottom-links";
import { projects } from "@/data/projects";

export const metadata = {
  title: "Projects — archive_13",
};

export default function ProjectsPage() {
  return (
    <section className="content-page">
      <header className="section-header">
        <h1>projects</h1>
        <p>campaigns, editorial systems, and personal studies</p>
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
