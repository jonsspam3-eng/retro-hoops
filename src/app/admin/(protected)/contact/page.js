import { AdminShell } from "@/components/admin-cms/admin-shell";
import { SiteSectionForm } from "@/components/admin-cms/site-section-form";
import { getSiteConfig } from "@/lib/cms";

export const metadata = {
  title: "Admin Contact",
};

export default async function AdminContactPage() {
  const site = await getSiteConfig();

  const initialData = {
    pageHeaders: site.pageHeaders,
    contactIntro: site.contact.intro,
    contactCollaboration: site.contact.collaborationLine,
    contactEmail: site.contact.email,
    socialLinks: site.socialLinks,
  };

  return (
    <AdminShell title="contact" description="Update inquiry copy and social links.">
      <SiteSectionForm section="contact" initialData={initialData} />
    </AdminShell>
  );
}
