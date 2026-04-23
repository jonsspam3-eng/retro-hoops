import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getPublicContent, listProjects } from "@/lib/cms";

export async function generateStaticParams() {
  const projects = await listProjects({ includeUnpublished: false });
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }) {
  const content = await getPublicContent();
  const project = await getProjectBySlug(params.slug);
  if (!project) {
    return {
      title: `Project not found — ${content.site.siteName}`,
    };
  }

  return {
    title: `${project.title} — ${content.site.siteName}`,
  };
}

export default async function ProjectDetailPage({ params }) {
  const [content, projectRecord] = await Promise.all([
    getPublicContent(),
    getProjectBySlug(params.slug),
  ]);
  const project = projectRecord
    ? {
        title: projectRecord.title,
        discipline: projectRecord.category,
        year: "",
        summary: projectRecord.description,
        detail: projectRecord.description,
        image: projectRecord.thumbnail,
      }
    : null;
  const pageAlignClass = `align-${content.site.textAlign ?? "left"}`;

  if (!project || !projectRecord?.published) {
    notFound();
  }

  return (
    <article className={`project-detail ${pageAlignClass}`}>
      <Link href="/projects" className="back-link">
        {content.projectDetail.backLabel}
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
