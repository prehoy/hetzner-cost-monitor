import { Skeleton } from "./Skeleton";

// KPI row divided by hairlines, not cards — the ledger tell. Big mono numbers.
export function KpiStrip({
  items,
  loading,
}: {
  items: { label: string; value: string; sub?: string }[];
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--panel)] sm:grid-cols-4 sm:divide-x">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={
            // hairline separators that work in a 2-col (mobile) and 4-col (desktop) grid
            "px-4 py-3.5 sm:px-5 sm:py-4 " +
            (i % 2 === 1 ? "border-l border-[var(--border)] sm:border-l-0 " : "") +
            (i >= 2 ? "border-t border-[var(--border)] sm:border-t-0" : "")
          }
        >
          <div className="label">{it.label}</div>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <div className="num mt-1.5 text-xl font-medium tracking-tight text-[var(--text)] sm:text-2xl">
              {it.value}
            </div>
          )}
          {it.sub && !loading && (
            <div className="num mt-0.5 text-xs text-[var(--muted)]">{it.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
