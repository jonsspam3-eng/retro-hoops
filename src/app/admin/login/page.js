import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin-cms/admin-login-form";

export const metadata = {
  title: "Admin Login",
};

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/admin/dashboard");
  }

  return (
    <section className="content-page admin-page">
      <header className="section-header">
        <h1>admin login</h1>
        <p>Sign in to manage portfolio content.</p>
      </header>
      <AdminLoginForm />
    </section>
  );
}
