import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { getPublicContent } from "@/lib/cms";

export async function generateMetadata() {
  const content = await getPublicContent();
  return {
    title: `${content.site.siteName} — ${content.site.siteTitle}`,
    description: content.site.siteDescription,
  };
}

export default async function RootLayout({ children }) {
  const content = await getPublicContent();
  const textAlign = content.site.textAlign || "left";
  const homeTextAlign = content.site.homeTextAlign || "center";

  return (
    <html lang="en">
      <body
        style={{
          "--brand-primary": content.site.primaryColor,
          "--brand-bg": content.site.backgroundColor,
          "--brand-text": content.site.textColor,
          "--site-text-align": textAlign,
          "--home-text-align": homeTextAlign,
        }}
      >
        <ThemeProvider defaultTheme={content.site.defaultTheme}>
          <div className="site-frame">
            <MainNav navigationLinks={content.navigationLinks} site={content.site} />
            <main className="page-main">{children}</main>
            <SiteFooter
              footerNote={content.site.footerNote}
              socialLinks={content.socialLinks}
            />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
