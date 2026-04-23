import { SiteSectionForm } from "@/components/admin-cms/site-section-form";
import { getSiteConfig } from "@/lib/cms";
import { AdminShell } from "@/components/admin-cms/admin-shell";

export const metadata = {
  title: "Admin Settings",
};

export default async function AdminSettingsPage() {
  const config = await getSiteConfig();

  const initialData = {
    siteDescription: config.siteDescription,
    footerNote: config.footerNote,
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    defaultTheme: config.defaultTheme,
    textAlign: config.textAlign,
    homeTextAlign: config.homeTextAlign,
    notFoundTitle: config.notFound.title,
    notFoundMessage: config.notFound.message,
    notFoundBackLabel: config.notFound.backLabel,
  };

  return (
    <AdminShell title="settings" description="Theme, palette, footer, and utility copy.">
      <SiteSectionForm section="settings" initialData={initialData} />
    </AdminShell>
  );
}
