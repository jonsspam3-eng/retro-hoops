"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

async function runCredentialsSignIn(email: string, password: string) {
  return signIn("credentials", {
    email,
    password,
    redirect: false,
    callbackUrl: "/dashboard",
  });
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      method="get"
      action="/api/auth/signin"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
          const data = new FormData(event.currentTarget);
          const result = await runCredentialsSignIn(String(data.get("email")), String(data.get("password")));

          if (result?.ok) {
            window.location.href = "/dashboard";
            return;
          }

          setError("Invalid credentials. Use seeded demo users shown below.");
        } catch {
          setError("Sign-in did not initialize. Use the secure fallback sign-in button below.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <input type="hidden" name="callbackUrl" value="/dashboard" />
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6f78]">Email</label>
        <input name="email" type="email" placeholder="name@srealty.nyc" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6f78]">Password</label>
        <input name="password" type="password" placeholder="••••••••" required />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {googleEnabled ? (
        <button
          type="button"
          className="w-full bg-[#ddbda2] text-[#050b23] hover:bg-[#cfa887]"
          onClick={async () => {
            setError(null);
            await signIn("google", { callbackUrl: "/dashboard" });
          }}
        >
          Sign in with Google
        </button>
      ) : null}
      <Link
        href="/api/auth/signin?callbackUrl=%2Fdashboard"
        className="block w-full rounded-lg border border-[#d7d2cb] bg-white px-4 py-2 text-center text-sm font-medium text-[#050b23] hover:bg-[#f8f6f3]"
        prefetch={false}
      >
        Secure fallback sign-in
      </Link>
      <p className="text-xs text-[#6d6f78]">
        Admin/Super Admin users must use Google sign-in with enforced MFA in production.
      </p>
    </form>
  );
}
