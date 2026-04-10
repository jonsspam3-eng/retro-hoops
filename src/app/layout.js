import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { brandConfig } from "@/data/brand-config";
import { siteContent } from "@/data/site-content";

export const metadata = {
  title: `${brandConfig.siteName} — ${siteContent.siteTitle}`,
  description: siteContent.siteDescription,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          "--brand-primary": brandConfig.primaryColor,
          "--brand-bg": brandConfig.backgroundColor,
          "--brand-text": brandConfig.textColor,
        }}
      >
        <ThemeProvider>
          <div className="site-frame">
            <MainNav />
            <main className="page-main">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
