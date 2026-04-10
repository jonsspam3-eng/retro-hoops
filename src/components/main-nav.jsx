"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryLinks } from "@/data/navigation";
import { useTheme } from "@/components/theme-provider";

export function MainNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Primary">
        <Link href="/" className="nav-wordmark">
          archive_13
        </Link>

        <div className="nav-links-wrap">
          <ul className="nav-links">
            {primaryLinks.map((link) => (
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
