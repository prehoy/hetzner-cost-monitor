import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { authStatusOptions } from "~/api";
import { savingsOpts } from "~/api/savings";
import { AppShell } from "~/components/AppShell";
import { KpiStrip } from "~/components/KpiStrip";
import { Skeleton } from "~/components/Skeleton";
import { money } from "~/lib/format";

export const Route = createFileRoute("/savings")({
  beforeLoad: async ({ context }) => {
    const s = await context.queryClient.fetchQuery(authStatusOptions());
    if (!s.authenticated) throw redirect({ to: "/login" });
  },
  component: Savings,
});

const CATEGORY_LABEL: Record<string, string> = {
  server: "Server",
  volume: "Volume",
  load_balancer: "Load balancer",
  primary_ip: "Primary IP",
  floating_ip: "Floating IP",
  snapshot: "Snapshot",
  backup: "Backup",
};

function Savings() {
  const q = useQuery({ ...savingsOpts(), refetchInterval: 30_000 });
  const currency = q.data?.currency ?? "EUR";
  const findings = q.data?.findings ?? [];
  const multiProject = new Set(findings.map((f) => f.projectId)).size > 1;

  const kpis = [
    { label: "Reclaimable / month", value: money(q.data?.total ?? 0, currency), sub: "net" },
    { label: "Findings", value: String(findings.length) },
  ];

  return (
    <AppShell>
      {() => (
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            Reclaimable spend — unattached volumes and IPs, off-but-billed servers, empty load
            balancers, and stale snapshots. Findings are{" "}
            <span className="text-[var(--text)]">advisory</span>: we use a read-only token and never
            touch your infrastructure.
          </div>

          <KpiStrip items={kpis} loading={q.isLoading} />

          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="label py-2 px-3 text-left">Resource</th>
                    <th className="label py-2 px-3 text-left">Category</th>
                    <th className="label py-2 px-3 text-left">Issue</th>
                    <th className="label py-2 px-3 text-right">€/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {q.isLoading &&
                    findings.length === 0 &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="border-b border-[var(--border)]">
                        {Array.from({ length: 4 }).map((__, j) => (
                          <td key={j} className="py-2.5 px-3">
                            <Skeleton className={j === 3 ? "h-4 w-16 ml-auto" : "h-4 w-40"} />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {findings.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]"
                    >
                      <td className="py-2.5 px-3 align-top text-[var(--text)]">
                        {f.name || "—"}
                        <div className="num mt-0.5 text-xs text-[var(--muted)]">
                          {multiProject && <>{f.projectName} · </>}
                          {f.location || "no location"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top text-[var(--muted)]">
                        {CATEGORY_LABEL[f.category] ?? f.category}
                      </td>
                      <td className="py-2.5 px-3 align-top text-[var(--text)]">
                        {f.reason}
                        <div className="mt-0.5 text-xs text-[var(--muted)]">{f.fix}</div>
                      </td>
                      <td className="num py-2.5 px-3 text-right align-top font-medium text-[var(--text)]">
                        {money(f.monthlyCost, currency)}
                      </td>
                    </tr>
                  ))}

                  {!q.isLoading && findings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[var(--muted)]">
                        No reclaimable spend found — your estate looks tight.
                      </td>
                    </tr>
                  )}
                </tbody>
                {findings.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border)] text-[var(--text)]">
                      <td className="label py-2.5 px-3" colSpan={3}>
                        Total reclaimable
                      </td>
                      <td className="num py-2.5 px-3 text-right font-semibold">
                        {money(q.data?.total ?? 0, currency)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
