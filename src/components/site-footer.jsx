import Link from "next/link";
import { siteContent } from "@/data/site-content";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <small>{siteContent.footerNote}</small>
        <ul className="footer-links" aria-label="Social links">
          {siteContent.socialLinks.map((item) => (
            <li key={item.href}>
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
