import { AdminShell } from "@/components/admin-cms/admin-shell";
import { ProjectsManager } from "@/components/admin-cms/project-form";
import { listProjects } from "@/lib/cms";

export default async function AdminProjectsPage() {
  const projects = await listProjects({ includeUnpublished: true });

  return (
    <AdminShell title="projects" description="Create, edit, publish, and reorder work.">
      <ProjectsManager initialProjects={projects} />
    </AdminShell>
  );
}
