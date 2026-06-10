import { createTeamMemberAction } from "@/lib/actions";
import { requireAppUser } from "@/lib/auth";
import { adminRoles, hasRole } from "@/lib/security";
import { listTeamMembers } from "@/lib/repository";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireAppUser();
  if (!hasRole(user.role, adminRoles)) {
    redirect("/dashboard");
  }

  const team = await listTeamMembers();

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Team Roles & Permissions</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Super Admin, Admin, Manager, Agent, Assistant, and Read-only role model for leasing workflow controls.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#6d6f78]">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id} className="border-t border-[#ece8e3]">
                  <td className="py-2 font-medium">{member.name}</td>
                  <td className="py-2">{member.email}</td>
                  <td className="py-2">{member.role.replaceAll("_", " ")}</td>
                  <td className="py-2">{member.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form action={createTeamMemberAction} className="card space-y-3">
          <h3 className="text-lg font-semibold">Add team member</h3>
          <input name="name" placeholder="Full name" required />
          <input name="email" type="email" placeholder="Email" required />
          <select name="role" defaultValue="AGENT">
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="AGENT">Agent</option>
            <option value="MARKETING_ASSISTANT">Marketing/Admin Assistant</option>
            <option value="ASSISTANT">Marketing/Admin Assistant</option>
            <option value="READ_ONLY">Read-only</option>
          </select>
          <input name="password" type="password" placeholder="Temporary password" required />
          <button type="submit">Create team member</button>
        </form>
      </section>
    </div>
  );
}
