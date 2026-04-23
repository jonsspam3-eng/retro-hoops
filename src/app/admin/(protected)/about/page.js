import { AdminShell } from "@/components/admin-cms/admin-shell";
import { SiteSectionForm } from "@/components/admin-cms/site-section-form";
import { getSiteConfig } from "@/lib/cms";

export const metadata = {
  title: "Admin About",
};

export default async function AdminAboutPage() {
  const config = await getSiteConfig();

  const initialData = {
    pageHeaders: config.pageHeaders,
    aboutParagraphs: config.about.paragraphs,
    aboutSections: config.about.sections,
  };

  return (
    <AdminShell
      title="about"
      description="Edit about page title, paragraphs, and section blocks."
    >
      <SiteSectionForm section="about" initialData={initialData} />
    </AdminShell>
  );
}
