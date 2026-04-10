import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata = {
  title: "archive_13 — creative portfolio",
  description:
    "Minimal editorial portfolio for photography, projects, moodboards, and creative archive work.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
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
