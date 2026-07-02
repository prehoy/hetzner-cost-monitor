import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  authStatusOptions,
  pricingOverrideDeleteMutation,
  pricingOverrideSetMutation,
  pricingOverridesOptions,
  pricingOverridesQueryKey,
} from "~/api";
import { AppShell } from "~/components/AppShell";
import { money } from "~/lib/format";

export const Route = createFileRoute("/pricing")({
  beforeLoad: async ({ context }) => {
    const s = await context.queryClient.fetchQuery(authStatusOptions());
    if (!s.authenticated) throw redirect({ to: "/login" });
  },
  component: Pricing,
});

function Pricing() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: pricingOverridesQueryKey() });
  const q = useQuery(pricingOverridesOptions());
  const currency = (q.data as any)?.currency ?? "EUR";
  const servers = ((q.data as any)?.servers ?? []) as any[];
  const multiProject = new Set(servers.map((s) => s.projectId)).size > 1;

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const set = useMutation({ ...pricingOverrideSetMutation(), onSuccess: invalidate });
  const del = useMutation({ ...pricingOverrideDeleteMutation(), onSuccess: invalidate });

  const rows = useMemo(() => {
    const n = search.trim().toLowerCase();
    if (!n) return servers;
    return servers.filter((s) =>
      [s.name, s.hetznerType, s.location, s.projectName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(n)),
    );
  }, [servers, search]);

  const field =
    "num w-28 rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";
  const cols = multiProject ? 6 : 5;

  return (
    <AppShell>
      {() => (
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            Costs are estimated from Hetzner&apos;s <span className="text-[var(--text)]">current</span>{" "}
            <code>/v1/pricing</code>. Because grandfathering is <em>per server</em> (each keeps the
            price it was created at), set the real monthly price on the specific servers that pay a
            legacy rate — the collector then uses it for that server.
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
              <span className="text-[var(--muted)]">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search servers — name, type, location…"
                className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]"
              />
              <span className="num shrink-0 text-xs text-[var(--muted)]">{rows.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="label py-2 px-3 text-left">Server</th>
                    {multiProject && <th className="label py-2 px-3 text-left">Project</th>}
                    <th className="label py-2 px-3 text-left">Type · loc</th>
                    <th className="label py-2 px-3 text-right">List €/mo</th>
                    <th className="label py-2 px-3 text-right">Your €/mo</th>
                    <th className="label py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const key = `${s.projectId}:${s.hetznerId}`;
                    const effective = s.overrideMonthly ?? s.listMonthly;
                    const val = edits[key] ?? String(effective ?? "");
                    const dirty = edits[key] != null && Number(val) !== effective;
                    return (
                      <tr
                        key={key}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]"
                      >
                        <td className="py-2 px-3 text-[var(--text)]">
                          {s.name}
                          {s.overrideMonthly != null && (
                            <span className="ml-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                              override
                            </span>
                          )}
                        </td>
                        {multiProject && (
                          <td className="py-2 px-3 text-[var(--muted)]">{s.projectName}</td>
                        )}
                        <td className="num py-2 px-3 text-[var(--muted)]">
                          {s.hetznerType} · {s.location || "—"}
                        </td>
                        <td className="num py-2 px-3 text-right text-[var(--muted)]">
                          {money(s.listMonthly, currency)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            className={field}
                            value={val}
                            inputMode="decimal"
                            onChange={(e) => setEdits((x) => ({ ...x, [key]: e.target.value }))}
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            disabled={!dirty || set.isPending}
                            onClick={() =>
                              set.mutate({
                                body: {
                                  projectId: s.projectId,
                                  hetznerId: s.hetznerId,
                                  monthlyCost: Number(val),
                                },
                              })
                            }
                            className="mr-3 text-xs text-[var(--accent)] disabled:text-[var(--faint)]"
                          >
                            Save
                          </button>
                          <button
                            disabled={s.overrideMonthly == null}
                            onClick={() => {
                              setEdits((x) => {
                                const n = { ...x };
                                delete n[key];
                                return n;
                              });
                              del.mutate({
                                body: { projectId: s.projectId, hetznerId: s.hetznerId },
                              });
                            }}
                            className="text-xs text-[var(--muted)] hover:text-[var(--text)] disabled:text-[var(--faint)]"
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={cols} className="py-10 text-center text-[var(--muted)]">
                        {servers.length === 0 ? "No servers yet — add a project first." : "No matches."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
