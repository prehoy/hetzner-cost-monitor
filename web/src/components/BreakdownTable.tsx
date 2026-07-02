import { useState } from "react";
import { cn } from "~/lib/cn";
import { perHour, perMonth } from "~/lib/format";

export type ResourceRow = {
  id: number;
  category: string;
  name?: string | null;
  hetznerType?: string | null;
  location?: string | null;
  hourlyCost: number;
  monthlyCost: number;
};

type SortKey = "name" | "category" | "location" | "hourlyCost" | "monthlyCost";

// Dense, sortable ledger table. Numbers right-aligned & monospace; rows ruled
// by hairlines rather than filled zebra.
export function BreakdownTable({
  rows,
  currency,
  vatMultiplier,
}: {
  rows: ResourceRow[];
  currency: string;
  vatMultiplier: number;
}) {
  const [sort, setSort] = useState<SortKey>("monthlyCost");
  const [dir, setDir] = useState<1 | -1>(-1);

  const sorted = [...rows].sort((a, b) => {
    const av = a[sort] ?? "";
    const bv = b[sort] ?? "";
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

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
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--panel)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {th("name", "Resource")}
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
              key={r.id}
              className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]"
            >
              <td className="py-2 px-3 text-[var(--text)]">{r.name || "—"}</td>
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
              <td colSpan={6} className="py-10 text-center text-[var(--muted)]">
                No resources yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
