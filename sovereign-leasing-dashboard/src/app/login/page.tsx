import { LoginForm } from "@/app/login/login-form";
import { getLoginErrorMessage } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const errorMessage = getLoginErrorMessage(params.error);
  const googleEnabled = Boolean(process.env.GOOGLE_AUTH_CLIENT_ID && process.env.GOOGLE_AUTH_CLIENT_SECRET);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Sovereign Realty CRM</p>
          <p className="mt-1 text-sm font-medium text-[#a3764a]">Leasing operations</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            One operating view for every inquiry, showing, application, and lease.
          </h1>
        </div>
        <div className="card p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your CRM account to manage Gmail imports and leads.</p>
          {errorMessage ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
          <div className="mt-5">
            <LoginForm googleEnabled={googleEnabled} />
          </div>
        </div>
      </div>
    </div>
  );
}
