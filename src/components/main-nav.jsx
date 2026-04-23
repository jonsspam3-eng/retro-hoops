"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { LogoMark } from "@/components/logo-mark";

export function MainNav({ navigationLinks = [], site }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Primary">
        <Link
          href="/"
          className="nav-wordmark"
          aria-label="Go to homepage"
          onClick={closeMenu}
        >
          <LogoMark
            className="nav-logo"
            altSuffix="wordmark"
            logoPath={site?.logoPath}
            siteName={site?.siteName ?? "portfolio"}
          />
        </Link>
        <p className="site-title-mark">{site?.siteTitle || "creative portfolio"}</p>

        <div className="nav-links-wrap">
          <button
            type="button"
            className="nav-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-nav-links"
            onClick={() => setMenuOpen((open) => !open)}
          >
            menu
          </button>

          <ul id="site-nav-links" className={`nav-links ${menuOpen ? "is-open" : ""}`}>
            {navigationLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive ? "active" : undefined}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/admin/dashboard" onClick={closeMenu}>
                admin
              </Link>
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
