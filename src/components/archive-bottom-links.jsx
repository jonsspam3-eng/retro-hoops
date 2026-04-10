import Link from "next/link";
import { bottomNavLinks } from "@/data/navigation";

export function ArchiveBottomLinks() {
  return (
    <nav className="archive-bottom-nav" aria-label="Archive utility links">
      {bottomNavLinks.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
