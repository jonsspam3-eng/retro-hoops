import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f6f3] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e7dfd7] bg-white p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6d6f78]">Sovereign Realty NYC</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#050b23]">Leasing Command Sign-In</h1>
        <p className="mt-2 text-sm text-[#6d6f78]">Demo credentials: admin@sovereignnyc.com / Sovereign123!</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
