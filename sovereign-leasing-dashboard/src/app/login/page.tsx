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
    <div className="flex min-h-screen items-center justify-center bg-[#f8f6f3] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e7dfd7] bg-white p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6d6f78]">Sovereign Realty NYC</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#050b23]">Sign in to Sovereign Leasing Ops</h1>
        <p className="mt-2 text-sm text-[#6d6f78]">
          Use approved credentials or approved Google sign-in. Unauthorized accounts are denied.
        </p>
        {errorMessage ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm googleEnabled={googleEnabled} />
        </div>
      </div>
    </div>
  );
}
