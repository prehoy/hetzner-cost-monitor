// KPI row divided by hairlines, not cards — the ledger tell. Big mono numbers.
export function KpiStrip({
  items,
}: {
  items: { label: string; value: string; sub?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--panel)] sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="px-5 py-4">
          <div className="label">{it.label}</div>
          <div className="num mt-1.5 text-2xl font-medium tracking-tight text-[var(--text)]">
            {it.value}
          </div>
          {it.sub && <div className="num mt-0.5 text-xs text-[var(--muted)]">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}
