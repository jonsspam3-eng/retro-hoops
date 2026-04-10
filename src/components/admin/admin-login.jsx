"use client";

import { useState } from "react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to sign in.");
      }

      setStatus("success");
      setMessage("Access granted. Loading editor...");
      window.location.reload();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to sign in.");
    }
  }

  return (
    <section className="admin-auth">
      <h2>admin access</h2>
      <p>Enter your admin password to edit portfolio content.</p>

      <form className="admin-auth-form" onSubmit={handleLogin}>
        <label className="admin-field">
          <span>password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="admin-save">
          {status === "loading" ? "checking..." : "unlock editor"}
        </button>
      </form>

      {message ? <p className={`admin-message is-${status}`}>{message}</p> : null}
    </section>
  );
}
