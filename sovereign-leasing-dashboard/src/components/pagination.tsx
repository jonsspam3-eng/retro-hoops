import Link from "next/link";
import clsx from "clsx";

function pageHref(basePath: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(page));
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  params,
  page,
  pageCount,
  total,
  pageSize,
  label = "leads",
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  label?: string;
}) {
  if (total === 0) return null;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass =
    "inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-[#f4efe8]";
  const disabledClass = "pointer-events-none opacity-40";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
      <p className="text-xs text-muted">
        Showing <span className="font-semibold text-ink">{from}–{to}</span> of{" "}
        <span className="font-semibold text-ink">{total}</span> {label}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <Link
            href={pageHref(basePath, searchParams, page - 1)}
            className={clsx(linkClass, page <= 1 && disabledClass)}
            aria-disabled={page <= 1}
          >
            ← Previous
          </Link>
          <span className="text-xs text-muted">
            Page {page} of {pageCount}
          </span>
          <Link
            href={pageHref(basePath, searchParams, page + 1)}
            className={clsx(linkClass, page >= pageCount && disabledClass)}
            aria-disabled={page >= pageCount}
          >
            Next →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
