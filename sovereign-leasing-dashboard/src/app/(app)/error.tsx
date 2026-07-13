"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="mt-1 max-w-md text-sm text-muted">
          The page failed to load. Retry, or contact an administrator if the problem persists.
          {error.digest ? ` (Reference: ${error.digest})` : ""}
        </p>
      </div>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
