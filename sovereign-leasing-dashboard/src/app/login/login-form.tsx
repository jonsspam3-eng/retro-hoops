"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

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
        const result = await signIn("credentials", {
          email: data.get("email"),
          password: data.get("password"),
          redirect: false,
        });

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
        <input name="email" type="email" placeholder="admin@sovereignnyc.com" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6d6f78]">Password</label>
        <input name="password" type="password" placeholder="••••••••" required />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
