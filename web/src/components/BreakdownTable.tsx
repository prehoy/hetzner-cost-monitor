import { useMemo, useState } from "react";
import { cn } from "~/lib/cn";
import { perHour, perMonth } from "~/lib/format";

export type ResourceRow = {
  id: number;
  projectId: number;
  category: string;
  name?: string | null;
  hetznerType?: string | null;
  location?: string | null;
  hourlyCost: number;
  monthlyCost: number;
};

type SortKey = "name" | "category" | "location" | "hourlyCost" | "monthlyCost";

// Dense, sortable, searchable ledger table. Numbers right-aligned & monospace;
// rows ruled by hairlines. Footer totals the visible rows.
export function BreakdownTable({
  rows,
  currency,
  vatMultiplier,
  projectName,
}: {
  rows: ResourceRow[];
  currency: string;
  vatMultiplier: number;
  projectName?: (id: number) => string; // when set, shows a Project column
}) {
  const [sort, setSort] = useState<SortKey>("monthlyCost");
  const [dir, setDir] = useState<1 | -1>(-1);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.category, r.hetznerType, r.location, projectName?.(r.projectId)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [rows, q, projectName]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const av = a[sort] ?? "";
        const bv = b[sort] ?? "";
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      }),
    [filtered, sort, dir],
  );

  const totalHourly = filtered.reduce((s, r) => s + r.hourlyCost, 0);
  const totalMonthly = filtered.reduce((s, r) => s + r.monthlyCost, 0);
  const cols = projectName ? 7 : 6;

  const th = (key: SortKey, label: string, align: "left" | "right" = "left") => (
    <th
      onClick={() => (sort === key ? setDir((d) => (d === 1 ? -1 : 1)) : (setSort(key), setDir(1)))}
      className={cn(
        "label cursor-pointer select-none py-2 px-3 hover:text-[var(--text)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {label}
      {sort === key ? (dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)]">
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span className="text-[var(--muted)]">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources — name, type, location…"
          className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
        />
        <span className="num shrink-0 text-xs text-[var(--muted)]">
          {filtered.length}
          {filtered.length !== rows.length ? ` / ${rows.length}` : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {th("name", "Resource")}
              {projectName && <th className="label py-2 px-3 text-left">Project</th>}
              {th("category", "Category")}
              <th className="label py-2 px-3 text-left">Type</th>
              {th("location", "Loc")}
              {th("hourlyCost", "€/hr", "right")}
              {th("monthlyCost", "€/mo", "right")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={`${r.id}-${r.category}`}
                className="border-b border-[var(--border)] hover:bg-[var(--hover)]"
              >
                <td className="py-2 px-3 text-[var(--text)]">{r.name || "—"}</td>
                {projectName && (
                  <td className="py-2 px-3 text-[var(--muted)]">{projectName(r.projectId)}</td>
                )}
                <td className="py-2 px-3">
                  <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
                    {r.category}
                  </span>
                </td>
                <td className="num py-2 px-3 text-[var(--muted)]">{r.hetznerType || "—"}</td>
                <td className="num py-2 px-3 text-[var(--muted)]">{r.location || "—"}</td>
                <td className="num py-2 px-3 text-right text-[var(--text)]">
                  {perHour(r.hourlyCost, currency, vatMultiplier)}
                </td>
                <td className="num py-2 px-3 text-right text-[var(--text)]">
                  {perMonth(r.monthlyCost, currency, vatMultiplier)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={cols} className="py-10 text-center text-[var(--muted)]">
                  {rows.length === 0 ? "No resources yet." : "No matches."}
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-[var(--border)] text-[var(--text)]">
                <td className="label py-2 px-3" colSpan={cols - 2}>
                  Total{q ? " (filtered)" : ""}
                </td>
                <td className="num py-2 px-3 text-right font-medium">
                  {perHour(totalHourly, currency, vatMultiplier)}
                </td>
                <td className="num py-2 px-3 text-right font-medium">
                  {perMonth(totalMonthly, currency, vatMultiplier)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
