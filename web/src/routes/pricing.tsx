import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  const types = ((q.data as any)?.types ?? []) as any[];

  const [edits, setEdits] = useState<Record<string, string>>({});
  const set = useMutation({ ...pricingOverrideSetMutation(), onSuccess: invalidate });
  const del = useMutation({ ...pricingOverrideDeleteMutation(), onSuccess: invalidate });

  const field =
    "num w-28 rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

  return (
    <AppShell>
      {() => (
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            Costs are estimated from Hetzner&apos;s <span className="text-[var(--text)]">current</span>{" "}
            <code>/v1/pricing</code> rate card. Existing servers on grandfathered/legacy pricing
            (e.g. pre-June-2026 CCX rates) pay less than the list price — set the real monthly price
            per type below to correct it.
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="label py-2 px-3 text-left">Server type</th>
                  <th className="label py-2 px-3 text-right">In use</th>
                  <th className="label py-2 px-3 text-right">List €/mo</th>
                  <th className="label py-2 px-3 text-right">Your €/mo</th>
                  <th className="label py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => {
                  const effective = t.overrideMonthly ?? t.listMonthly;
                  const val = edits[t.serverType] ?? String(effective ?? "");
                  const dirty = edits[t.serverType] != null && Number(val) !== effective;
                  return (
                    <tr
                      key={t.serverType}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]"
                    >
                      <td className="num py-2 px-3 text-[var(--text)]">
                        {t.serverType}
                        {t.overrideMonthly != null && (
                          <span className="ml-2 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                            override
                          </span>
                        )}
                      </td>
                      <td className="num py-2 px-3 text-right text-[var(--muted)]">{t.count}</td>
                      <td className="num py-2 px-3 text-right text-[var(--muted)]">
                        {money(t.listMonthly, currency)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          className={field}
                          value={val}
                          inputMode="decimal"
                          onChange={(e) =>
                            setEdits((s) => ({ ...s, [t.serverType]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          disabled={!dirty || set.isPending}
                          onClick={() =>
                            set.mutate({
                              body: { serverType: t.serverType, monthlyCost: Number(val) },
                            })
                          }
                          className="mr-3 text-xs text-[var(--accent)] disabled:text-[var(--faint)]"
                        >
                          Save
                        </button>
                        <button
                          disabled={t.overrideMonthly == null}
                          onClick={() => {
                            setEdits((s) => {
                              const n = { ...s };
                              delete n[t.serverType];
                              return n;
                            });
                            del.mutate({ body: { serverType: t.serverType } });
                          }}
                          className="text-xs text-[var(--muted)] hover:text-[var(--text)] disabled:text-[var(--faint)]"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {types.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[var(--muted)]">
                      No servers yet — add a project first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
