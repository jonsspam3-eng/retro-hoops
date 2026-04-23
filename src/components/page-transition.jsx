"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-main page-main-enter">
      {children}
    </div>
  );
}
