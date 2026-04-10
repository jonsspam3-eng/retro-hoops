import { AdminEditor } from "@/components/admin/admin-editor";
import { AdminLogin } from "@/components/admin/admin-login";
import { cookies } from "next/headers";
import {
  getAdminCookieName,
  getContentStore,
  isAdminPasswordRequired,
  isAdminSessionValid,
  isLocalAdminEnabled,
} from "@/lib/content-store";

export const metadata = {
  title: "Admin Editor",
};

export default async function AdminPage() {
  if (!isLocalAdminEnabled()) {
    return (
      <section className="content-page prose-page">
        <header className="section-header">
          <h1>admin</h1>
        </header>
        <p>The local admin editor is disabled in this environment.</p>
      </section>
    );
  }

  const passwordRequired = isAdminPasswordRequired();
  const cookieStore = await cookies();
  const isAuthenticated = isAdminSessionValid(
    cookieStore.get(getAdminCookieName())?.value,
  );
  if (passwordRequired && !isAuthenticated) {
    return (
      <section className="content-page admin-page">
        <header className="section-header">
          <h1>admin</h1>
          <p>Password-protected local editor.</p>
        </header>
        <AdminLogin />
      </section>
    );
  }

  const content = await getContentStore();

  return (
    <section className="content-page admin-page">
      <header className="section-header">
        <h1>admin</h1>
        <p>Local editor for content and media paths.</p>
      </header>

      <AdminEditor initialContent={content} passwordProtected={passwordRequired} />
    </section>
  );
}
