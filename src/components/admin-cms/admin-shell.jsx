import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSignOutButton } from "@/components/admin-cms/admin-signout-button";

const adminNav = [
  { href: "/admin/dashboard", label: "dashboard" },
  { href: "/admin/projects", label: "projects" },
  { href: "/admin/homepage", label: "homepage" },
  { href: "/admin/about", label: "about" },
  { href: "/admin/contact", label: "contact" },
  { href: "/admin/settings", label: "settings" },
  { href: "/admin/media", label: "media" },
];

export async function AdminShell({ title, description, children }) {
  const session = await getServerSession(authOptions);

  return (
    <section className="content-page admin-cms-page">
      <header className="section-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <div className="admin-cms-layout">
        <aside className="admin-cms-sidebar">
          <p className="admin-cms-user">
            {session?.user?.email ? `signed in as ${session.user.email}` : "admin"}
          </p>
          <nav aria-label="Admin navigation">
            <ul>
              {adminNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <AdminSignOutButton />
        </aside>

        <div className="admin-cms-content">{children}</div>
      </div>
    </section>
  );
}
