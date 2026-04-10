import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brandConfig } from "@/data/brand-config";
import { projects } from "@/data/projects";
import { siteContent } from "@/data/site-content";

export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export function generateMetadata({ params }) {
  const project = projects.find((entry) => entry.slug === params.slug);
  if (!project) {
    return {
      title: `Project not found — ${brandConfig.siteName}`,
    };
  }

  return {
    title: `${project.title} — ${brandConfig.siteName}`,
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
        {siteContent.projectDetail.backLabel}
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
