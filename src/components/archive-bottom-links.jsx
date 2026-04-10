import Link from "next/link";
import { siteContent } from "@/data/site-content";

export function ArchiveBottomLinks() {
  return (
    <nav className="archive-bottom-nav" aria-label="Archive utility links">
      {siteContent.archiveBottomLinks.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
