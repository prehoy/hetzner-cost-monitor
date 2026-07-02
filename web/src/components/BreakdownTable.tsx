import { useMemo, useState } from "react";
import { cn } from "~/lib/cn";
import { perHour, perMonth } from "~/lib/format";
import { Skeleton } from "./Skeleton";

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

const CATEGORY_LABEL: Record<string, string> = {
  server: "Servers",
  volume: "Volumes",
  load_balancer: "Load balancers",
  primary_ip: "Primary IPs",
  floating_ip: "Floating IPs",
  snapshot: "Snapshots",
  backup: "Backups",
  traffic: "Traffic",
};

// Resources grouped by category, each a collapsible section with a subtotal, so
// the view is a scannable overview rather than one overwhelming flat list.
// Search filters and auto-expands matching groups.
export function BreakdownTable({
  rows,
  currency,
  vatMultiplier,
  projectName,
  loading,
}: {
  rows: ResourceRow[];
  currency: string;
  vatMultiplier: number;
  projectName?: (id: number) => string;
  loading?: boolean;
}) {
  const [q, setQ] = useState("");
  // Default collapsed: the overview is 7 category subtotals, expand to drill in.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const searching = q.trim().length > 0;

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) =>
      [r.name, r.category, r.hetznerType, r.location, projectName?.(r.projectId)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(n)),
    );
  }, [rows, q, projectName]);

  const groups = useMemo(() => {
    const map = new Map<string, ResourceRow[]>();
    for (const r of filtered) (map.get(r.category) ?? map.set(r.category, []).get(r.category)!).push(r);
    return [...map.entries()]
      .map(([cat, items]) => ({
        cat,
        items: items.sort((a, b) => b.monthlyCost - a.monthlyCost),
        hourly: items.reduce((s, r) => s + r.hourlyCost, 0),
        monthly: items.reduce((s, r) => s + r.monthlyCost, 0),
      }))
      .sort((a, b) => b.monthly - a.monthly);
  }, [filtered]);

  const totalHourly = filtered.reduce((s, r) => s + r.hourlyCost, 0);
  const totalMonthly = filtered.reduce((s, r) => s + r.monthlyCost, 0);
  const cols = projectName ? 6 : 5;
  const leadCols = cols - 2;

  const toggle = (cat: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)]">
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
              <th className="label py-2 px-3 text-left">Resource</th>
              {projectName && <th className="label py-2 px-3 text-left">Project</th>}
              <th className="label py-2 px-3 text-left">Type</th>
              <th className="label py-2 px-3 text-left">Loc</th>
              <th className="label py-2 px-3 text-right">€/hr</th>
              <th className="label py-2 px-3 text-right">€/mo</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-[var(--border)]">
                  {Array.from({ length: cols }).map((__, j) => (
                    <td key={j} className="py-2.5 px-3">
                      <Skeleton className={cn("h-4", j === 0 ? "w-40" : "w-16 ml-auto")} />
                    </td>
                  ))}
                </tr>
              ))}

            {groups.map((g) => {
              const open = searching || expanded.has(g.cat);
              return (
                <GroupRows
                  key={g.cat}
                  group={g}
                  open={open}
                  onToggle={() => toggle(g.cat)}
                  cols={cols}
                  leadCols={leadCols}
                  projectName={projectName}
                  currency={currency}
                  vatMultiplier={vatMultiplier}
                />
              );
            })}

            {groups.length === 0 && !(loading && rows.length === 0) && (
              <tr>
                <td colSpan={cols} className="py-10 text-center text-[var(--muted)]">
                  {rows.length === 0 ? "No resources yet." : "No matches."}
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] text-[var(--text)]">
                <td className="label py-2.5 px-3" colSpan={leadCols}>
                  Total{searching ? " (filtered)" : ""}
                </td>
                <td className="num py-2.5 px-3 text-right font-semibold">
                  {perHour(totalHourly, currency, vatMultiplier)}
                </td>
                <td className="num py-2.5 px-3 text-right font-semibold">
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

function GroupRows({
  group,
  open,
  onToggle,
  cols,
  leadCols,
  projectName,
  currency,
  vatMultiplier,
}: {
  group: { cat: string; items: ResourceRow[]; hourly: number; monthly: number };
  open: boolean;
  onToggle: () => void;
  cols: number;
  leadCols: number;
  projectName?: (id: number) => string;
  currency: string;
  vatMultiplier: number;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-[var(--border)] bg-[var(--panel-2)] hover:bg-[var(--hover)]"
      >
        <td className="py-2 px-3" colSpan={leadCols}>
          <span className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              className={cn("h-3.5 w-3.5 text-[var(--muted)] transition-transform", open && "rotate-90")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-medium text-[var(--text)]">
              {CATEGORY_LABEL[group.cat] ?? group.cat}
            </span>
            <span className="num text-xs text-[var(--muted)]">{group.items.length}</span>
          </span>
        </td>
        <td className="num py-2 px-3 text-right text-[var(--muted)]">
          {perHour(group.hourly, currency, vatMultiplier)}
        </td>
        <td className="num py-2 px-3 text-right text-[var(--text)]">
          {perMonth(group.monthly, currency, vatMultiplier)}
        </td>
      </tr>
      {open &&
        group.items.map((r) => (
          <tr key={`${r.id}-${r.category}`} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
            <td className="py-2 px-3 pl-8 text-[var(--text)]">{r.name || "—"}</td>
            {projectName && <td className="py-2 px-3 text-[var(--muted)]">{projectName(r.projectId)}</td>}
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
    </>
  );
}
