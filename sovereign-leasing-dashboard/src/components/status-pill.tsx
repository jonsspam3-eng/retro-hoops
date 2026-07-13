import clsx from "clsx";

type Props = {
  label: string;
};

const colorMap: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  IMPORTED: "bg-sky-100 text-sky-800",
  NEEDS_REVIEW: "bg-amber-100 text-amber-800",
  DRAFT_CREATED: "bg-indigo-100 text-indigo-800",
  REPLIED: "bg-emerald-100 text-emerald-800",
  FOLLOW_UP_NEEDED: "bg-cyan-100 text-cyan-800",
  NEEDS_REPLY: "bg-amber-100 text-amber-800",
  NEEDS_MORE_INFO: "bg-orange-100 text-orange-800",
  POSSIBLY_QUALIFIED: "bg-violet-100 text-violet-800",
  QUALIFIED: "bg-emerald-100 text-emerald-800",
  NOT_QUALIFIED: "bg-rose-100 text-rose-800",
  FOLLOW_UP: "bg-cyan-100 text-cyan-800",
  SHOWING_REQUESTED: "bg-sky-100 text-sky-800",
  APPLICATION_REQUESTED: "bg-indigo-100 text-indigo-800",
  ARCHIVED: "bg-zinc-200 text-zinc-700",
  NOT_REQUESTED: "bg-zinc-100 text-zinc-700",
  SHOWING_CONFIRMED: "bg-emerald-100 text-emerald-800",
  SHOWING_COMPLETED: "bg-emerald-100 text-emerald-800",
  TIMES_OFFERED: "bg-sky-100 text-sky-800",
  NO_SHOW: "bg-rose-100 text-rose-800",
  RESCHEDULE_NEEDED: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  RENTED: "bg-slate-200 text-slate-700",
  INACTIVE: "bg-zinc-200 text-zinc-700",
};

export function StatusPill({ label }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ring-current/15",
        colorMap[label] ?? "bg-zinc-100 text-zinc-700",
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-60" aria-hidden />
      {label.replaceAll("_", " ")}
    </span>
  );
}
