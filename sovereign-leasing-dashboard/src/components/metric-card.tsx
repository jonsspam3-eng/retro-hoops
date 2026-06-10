export function MetricCard({ label, value, helper }: { label: string; value: number | string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-[#e7dfd7] bg-white p-4 shadow-sm">
      <p className="text-sm text-[#6d6f78]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#050b23]">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[#6d6f78]">{helper}</p> : null}
    </div>
  );
}
