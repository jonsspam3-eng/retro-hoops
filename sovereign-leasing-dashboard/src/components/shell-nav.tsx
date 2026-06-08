"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = {
  href: string;
  label: string;
  description: string;
};

const navItems: Item[] = [
  { href: "/dashboard", label: "Dashboard", description: "Operational queues" },
  { href: "/leads", label: "Leads", description: "Inquiry triage" },
  { href: "/gmail-import", label: "Gmail Import", description: "Inbox ingestion" },
  { href: "/listings", label: "Listings", description: "Inventory database" },
  { href: "/templates", label: "Templates", description: "Email responses" },
  { href: "/rules", label: "Rules", description: "Qualification engine" },
  { href: "/team", label: "Team", description: "Roles and access" },
  { href: "/reports", label: "Reports", description: "Performance analytics" },
];

export function ShellNav({ userName, role, children }: { userName: string; role: string; children: ReactNode }) {
  const currentPath = usePathname();
  const visibleItems = role === "ADMIN"
    ? [
        ...navItems.slice(0, 3),
        { href: "/admin/gmail-debug", label: "Gmail Debug", description: "Connection diagnostics" },
        ...navItems.slice(3),
      ]
    : navItems;

  return (
    <div className="min-h-screen bg-[#f8f6f3] text-[#050b23]">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl bg-[#050b23] p-5 text-white shadow-lg">
          <div className="mb-6 border-b border-white/20 pb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#ddbda2]">Sovereign Associates</p>
            <h1 className="text-xl font-semibold">Leasing Command</h1>
            <p className="mt-1 text-xs text-white/80">{userName} · {role.replaceAll("_", " ")}</p>
          </div>
          <nav className="space-y-2">
            {visibleItems.map((item) => {
              const active = currentPath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl p-3 transition ${
                    active ? "bg-[#ddbda2] text-[#050b23]" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs opacity-80">{item.description}</p>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-[#ddbda2]/50 bg-white/5 p-3 text-xs leading-relaxed">
            <p className="font-semibold text-[#ddbda2]">AI compliance reminder</p>
            <p>
              AI qualification is advisory only. Human review is required before decisions and communications that affect housing outcomes.
            </p>
          </div>
        </aside>

        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
