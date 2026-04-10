"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { LogoMark } from "@/components/logo-mark";
import { siteContent } from "@/data/site-content";

export function MainNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Primary">
        <Link href="/" className="nav-wordmark" aria-label="Go to homepage">
          <LogoMark className="nav-logo" altSuffix="wordmark" />
        </Link>

        <div className="nav-links-wrap">
          <ul className="nav-links">
            {siteContent.navigationLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={pathname === link.href ? "active" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
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
