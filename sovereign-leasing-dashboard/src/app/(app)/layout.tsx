import { LogoutButton } from "@/components/logout-button";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const baseNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", description: "Operational queues", icon: "dashboard" },
  { href: "/leads", label: "Leads", description: "Inquiry triage", icon: "leads" },
  { href: "/pipeline", label: "Pipeline", description: "Follow-ups + showings", icon: "pipeline" },
  { href: "/gmail-import", label: "Gmail Import", description: "Inbox ingestion", icon: "inbox" },
  { href: "/listings", label: "Listings", description: "Inventory database", icon: "listings" },
  { href: "/templates", label: "Templates", description: "Email responses", icon: "templates" },
  { href: "/rules", label: "Rules", description: "Qualification engine", icon: "rules" },
  { href: "/team", label: "Team", description: "Roles and access", icon: "team" },
  { href: "/reports", label: "Reports", description: "Performance analytics", icon: "reports" },
];

const adminNavItem: NavItem = {
  href: "/admin/gmail-debug",
  label: "Gmail Debug",
  description: "Connection diagnostics",
  icon: "debug",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAppUser();
  const userName = user.name ?? "Sovereign User";
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[264px_1fr] lg:gap-6 lg:p-6">
        <aside className="flex flex-col rounded-2xl bg-ink p-4 text-white shadow-lg lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:p-5">
          <div className="mb-5 border-b border-white/15 pb-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Sovereign Realty NYC</p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight">Leasing Command</h1>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink">
                {initialsOf(userName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/60">{user.role.replaceAll("_", " ")}</p>
              </div>
            </div>
          </div>

          <SidebarNav items={navItems} />

          <div className="mt-5 rounded-xl border border-accent/40 bg-white/5 p-3 text-xs leading-relaxed lg:mt-auto">
            <p className="font-semibold text-accent">AI compliance reminder</p>
            <p className="mt-1 text-white/75">
              AI qualification is advisory only. Human review is required before decisions and communications that
              affect housing outcomes.
            </p>
          </div>
          <LogoutButton />
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-[#fffdfa] px-4 py-3 text-xs text-muted">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="mt-0.5 size-4 shrink-0 text-accent"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              />
            </svg>
            <p>
              Internal use only. No emails are sent automatically. Draft Created — Human Review Required. AI output is
              advisory only and final leasing decisions must follow documented policy and legitimate rental criteria.
            </p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
