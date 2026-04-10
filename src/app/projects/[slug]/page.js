import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentStore, readContentStore } from "@/lib/content-store";

export async function generateStaticParams() {
  const content = await readContentStore();
  return content.projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }) {
  const content = await readContentStore();
  const project = content.projects.find((entry) => entry.slug === params.slug);
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
  const content = await getContentStore();
  const project = content.projects.find((entry) => entry.slug === params.slug);
  const pageAlignClass = content.site.textAlign === "right" ? "is-right" : "is-left";

  if (!project) {
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
