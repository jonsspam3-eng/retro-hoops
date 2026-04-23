import { AdminShell } from "@/components/admin-cms/admin-shell";
import { getSiteConfig } from "@/lib/cms";
import { SiteSectionForm } from "@/components/admin-cms/site-section-form";

export const metadata = {
  title: "Admin Homepage",
};

export default async function AdminHomepagePage() {
  const site = await getSiteConfig();

  return (
    <AdminShell
      title="homepage"
      description="Edit branding, homepage links, and navigation labels."
    >
      <SiteSectionForm section="homepage" initialData={site} />
    </AdminShell>
  );
}
