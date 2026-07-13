"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import clsx from "clsx";

type Option = { value: string; label: string };

export function LeadsFilterBar({
  statusOptions,
  sourceOptions,
  listingOptions,
}: {
  statusOptions: Option[];
  sourceOptions: Option[];
  listingOptions: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyParams({ q: value.trim() }), 350);
  }

  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-2 transition-opacity md:grid-cols-2 xl:grid-cols-4",
        isPending && "opacity-60",
      )}
    >
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, email, or subject…"
          className="pl-9"
          aria-label="Search leads"
        />
      </div>
      <select
        value={searchParams.get("status") ?? ""}
        onChange={(event) => applyParams({ status: event.target.value })}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("source") ?? ""}
        onChange={(event) => applyParams({ source: event.target.value })}
        aria-label="Filter by source"
      >
        <option value="">All sources</option>
        {sourceOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("listingId") ?? ""}
        onChange={(event) => applyParams({ listingId: event.target.value })}
        aria-label="Filter by listing"
      >
        <option value="">All listings</option>
        {listingOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
