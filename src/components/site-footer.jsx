import Link from "next/link";

export function SiteFooter({ footerNote = "", socialLinks = [] }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <small>{footerNote}</small>
        <ul className="footer-links" aria-label="Social links">
          {socialLinks.map((item) => (
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
