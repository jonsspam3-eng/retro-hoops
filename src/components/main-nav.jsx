"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { LogoMark } from "@/components/logo-mark";

export function MainNav({ navigationLinks = [], site }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Primary">
        <Link href="/" className="nav-wordmark" aria-label="Go to homepage">
          <LogoMark
            className="nav-logo"
            altSuffix="wordmark"
            logoPath={site?.logoPath}
            siteName={site?.siteName ?? "portfolio"}
          />
        </Link>

        <div className="nav-links-wrap">
          <ul className="nav-links">
            {navigationLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={pathname === link.href ? "active" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/admin/dashboard">admin</Link>
            </li>
          </ul>

          <button
            type="button"
            onClick={toggleTheme}
            className="mode-button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "light" : "dark"}
          </button>
        </div>
      </nav>
    </header>
  );
}
