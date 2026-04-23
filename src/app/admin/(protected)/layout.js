import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminToastProvider } from "@/components/admin-cms/toast-context";

export default async function ProtectedAdminLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/admin/login");
  }

  return <AdminToastProvider>{children}</AdminToastProvider>;
}
