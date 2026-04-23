"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);
    if (result?.error) {
      setError("Invalid credentials. Check email and password.");
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <section className="admin-auth">
      <h2>admin login</h2>
      <p>Sign in to manage portfolio content.</p>

      <form className="admin-auth-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          <span>email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="admin-field">
          <span>password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="admin-save">
          {isLoading ? "signing in..." : "sign in"}
        </button>
      </form>

      {error ? <p className="admin-message is-error">{error}</p> : null}
    </section>
  );
}
