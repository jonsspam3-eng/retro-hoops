import { ShellNav } from "@/components/shell-nav";
import { requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAppUser();

  return (
    <ShellNav userName={user.name ?? "Sovereign User"} role={user.role}>
      <div className="rounded-2xl border border-[#e7dfd7] bg-[#fffdfa] p-4 text-sm text-[#5e6070]">
        Internal use only. No emails are sent automatically. Draft Created — Human Review Required. AI output is advisory only and final leasing decisions must follow documented policy and legitimate rental criteria.
      </div>
      {children}
    </ShellNav>
  );
}
