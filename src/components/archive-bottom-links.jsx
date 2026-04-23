import Link from "next/link";

export function ArchiveBottomLinks({ links = [] }) {
  return (
    <nav className="archive-bottom-nav" aria-label="Archive utility links">
      {links.slice(0, 4).map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
