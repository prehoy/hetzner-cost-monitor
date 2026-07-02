import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { authStatusOptions, costsSummaryOptions, projectsListOptions } from "~/api";
import { breakdownOpts, timeseriesOpts } from "~/api/costs";
import { AppShell } from "~/components/AppShell";
import { BreakdownTable, type ResourceRow } from "~/components/BreakdownTable";
import { CostChart } from "~/components/CostChart";
import { KpiStrip } from "~/components/KpiStrip";
import { Segmented } from "~/components/Segmented";
import { perHour, perMonth, vatMultiplier } from "~/lib/format";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const s = await context.queryClient.fetchQuery(authStatusOptions());
    if (!s.authenticated) throw redirect({ to: "/login" });
  },
  component: Explorer,
});

const RANGES = { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 } as const;

function Explorer() {
  const [projectId, setProjectId] = useState("all");
  const [groupBy, setGroupBy] = useState<"category" | "location" | "project">("category");
  const [range, setRange] = useState<keyof typeof RANGES>("7d");
  const [gross, setGross] = useState(false);

  const projects = useQuery(projectsListOptions());
  const summary = useQuery({ ...costsSummaryOptions(), refetchInterval: 10_000 });
  const breakdown = useQuery({
    ...breakdownOpts(projectId !== "all" ? { projectId } : undefined),
    refetchInterval: 10_000,
  });

  const { from, to } = useMemo(() => {
    const now = Date.now();
    return { from: String(now - RANGES[range]), to: String(now) };
  }, [range]);
  const timeseries = useQuery({ ...timeseriesOpts({ groupBy, from, to }), refetchInterval: 30_000 });

  const currency = summary.data?.currency ?? "EUR";
  const vatRate = summary.data?.vatRate ?? 0;
  const mult = vatMultiplier(gross, vatRate);

  const kpis = [
    { label: "Cost / hour", value: perHour(summary.data?.totalHourly ?? 0, currency, mult) },
    {
      label: "Projected / month",
      value: perMonth(summary.data?.totalMonthly ?? 0, currency, mult),
    },
    {
      label: "Month to date",
      value: perMonth((summary.data as any)?.mtdAccrued ?? 0, currency, mult),
      sub: "actual billed",
    },
    {
      label: "Resources",
      value: String(
        (summary.data?.perProject ?? []).reduce((s: number, p: any) => s + p.resourceCount, 0),
      ),
    },
  ];

  const series = (timeseries.data?.series ?? []) as any[];
  const hasSeries = series.some((s) => s.points?.length);
  const noProjects = (projects.data?.projects ?? []).length === 0;

  return (
    <AppShell>
      {(theme) => (
        <div className="space-y-5">
          {noProjects && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 text-sm">
              No Hetzner projects yet.{" "}
              <Link to="/projects" className="text-[var(--accent)] underline">
                Add an API token
              </Link>{" "}
              to start tracking costs.
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none"
            >
              <option value="all">All projects</option>
              {(projects.data?.projects ?? []).map((p: any) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { value: "24h", label: "24h" },
                  { value: "7d", label: "7d" },
                  { value: "30d", label: "30d" },
                ]}
              />
              <Segmented
                value={gross ? "gross" : "net"}
                onChange={(v) => setGross(v === "gross")}
                options={[
                  { value: "net", label: "Net" },
                  { value: "gross", label: `Gross +${vatRate}%` },
                ]}
              />
            </div>
          </div>

          <KpiStrip items={kpis} />

          {/* Time-series */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="label">Accrued spend / hour</div>
              <Segmented
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: "category", label: "Category" },
                  { value: "location", label: "Location" },
                  { value: "project", label: "Project" },
                ]}
              />
            </div>
            {hasSeries ? (
              <CostChart series={series} resolved={theme} vatMultiplier={mult} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-[var(--muted)]">
                Collecting — the chart fills in as billing hours accrue.
              </div>
            )}
          </div>

          {/* Breakdown */}
          <BreakdownTable
            rows={(breakdown.data?.resources ?? []) as ResourceRow[]}
            currency={currency}
            vatMultiplier={mult}
          />
        </div>
      )}
    </AppShell>
  );
}
