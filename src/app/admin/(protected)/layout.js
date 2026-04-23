import { AdminShell } from "@/components/admin-cms/admin-shell";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <AdminShell title="admin" description="Portfolio CMS dashboard">
      {children}
    </AdminShell>
  );
}
