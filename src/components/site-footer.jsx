import Link from "next/link";
import { footerLinks } from "@/data/navigation";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <small>nyc / independent practice</small>
        <ul className="footer-links" aria-label="Social links">
          {footerLinks.map((item) => (
            <li key={item.href}>
              {/* Replace href values with your real social profile URLs. */}
              <Link href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
