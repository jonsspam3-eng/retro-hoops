import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";

export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export function generateMetadata({ params }) {
  const project = projects.find((entry) => entry.slug === params.slug);
  if (!project) {
    return {
      title: "Project not found — archive_13",
    };
  }

  return {
    title: `${project.title} — archive_13`,
  };
}

export default function ProjectDetailPage({ params }) {
  const project = projects.find((entry) => entry.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <article className="project-detail">
      <Link href="/projects" className="back-link">
        back to projects
      </Link>

      <header>
        <h1>{project.title}</h1>
        <p>
          {project.discipline} / {project.year}
        </p>
      </header>

      <Image src={project.image} alt={project.title} width={1700} height={1200} />

      <p>{project.detail}</p>
    </article>
  );
}
