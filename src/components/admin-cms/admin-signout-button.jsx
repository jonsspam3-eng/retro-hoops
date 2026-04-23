"use client";

import { signOut } from "next-auth/react";

export function AdminSignOutButton() {
  return (
    <button
      type="button"
      className="admin-cms-button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      sign out
    </button>
  );
}
