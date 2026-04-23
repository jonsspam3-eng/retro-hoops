"use client";

import { usePathname } from "next/navigation";

export function PageLoading() {
  const pathname = usePathname();

  return (
    <section className="content-page loading-page" aria-busy="true" aria-live="polite">
      <p>{pathname === "/" ? "loading archive..." : "loading page..."}</p>
      <div className="loading-line" />
    </section>
  );
}
