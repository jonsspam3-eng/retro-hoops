import Link from "next/link";

export function MetricCard({
  label,
  value,
  helper,
  href,
}: {
  label: string;
  value: number | string;
  helper?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {href ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4 shrink-0 text-muted/60 transition group-hover:translate-x-0.5 group-hover:text-ink"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card group block transition hover:-translate-y-0.5 hover:border-accent">
        {body}
      </Link>
    );
  }

  return <div className="card">{body}</div>;
}
