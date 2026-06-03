"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

const demoEmail = "admin@sovereignnyc.com";
const demoPassword = "Sovereign123!";

async function runSignIn(email: string, password: string) {
  return signIn("credentials", {
    email,
    password,
    redirect: false,
  });
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData(event.currentTarget);
        const result = await runSignIn(String(data.get("email")), String(data.get("password")));

        if (result?.ok) {
          window.location.href = "/dashboard";
          return;
        }

        setLoading(false);
        setError("Invalid credentials. Use seeded demo users shown below.");
      }}
    >
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6f78]">Email</label>
        <input name="email" type="email" placeholder="admin@sovereignnyc.com" defaultValue={demoEmail} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6f78]">Password</label>
        <input name="password" type="password" placeholder="••••••••" defaultValue={demoPassword} required />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <button
        type="button"
        className="w-full bg-[#ddbda2] text-[#050b23] hover:bg-[#cfa887]"
        onClick={async () => {
          setLoading(true);
          setError(null);
          const result = await runSignIn(demoEmail, demoPassword);
          if (result?.ok) {
            window.location.href = "/dashboard";
            return;
          }
          setLoading(false);
          setError("Demo sign-in failed. Verify seeded users are available.");
        }}
      >
        Quick demo sign-in
      </button>
    </form>
  );
}
