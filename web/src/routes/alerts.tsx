import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { authStatusOptions } from "~/api";
import { alertConfigOpts, alertConfigQueryKey, saveAlert } from "~/api/alerts";
import { AppShell } from "~/components/AppShell";
import { money } from "~/lib/format";

export const Route = createFileRoute("/alerts")({
  beforeLoad: async ({ context }) => {
    const s = await context.queryClient.fetchQuery(authStatusOptions());
    if (!s.authenticated) throw redirect({ to: "/login" });
  },
  component: Alerts,
});

const empty = { webhookUrl: "", threshold: 0, enabled: true };

function Alerts() {
  const qc = useQueryClient();
  const cfgQuery = useQuery(alertConfigOpts());
  const cfg = cfgQuery.data?.config;
  const currency = cfgQuery.data?.currency ?? "EUR";

  const [form, setForm] = useState({ ...empty });
  useEffect(() => {
    if (cfg)
      setForm({
        webhookUrl: cfg.webhookUrl ?? "",
        threshold: cfg.threshold ?? 0,
        enabled: cfg.enabled ?? true,
      });
  }, [cfg]);

  const save = useMutation({
    mutationFn: saveAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: alertConfigQueryKey() }),
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const field =
    "w-full rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";
  const label = "label mb-1 block";

  return (
    <AppShell>
      {() => (
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            Get pinged when projected spend crosses a line you set. HACM evaluates your projected
            €/mo burn and POSTs a JSON payload to your webhook when it breaches the threshold —
            works with{" "}
            <span className="text-[var(--text)]">Slack, Discord, and Mattermost</span> incoming
            webhooks.
          </div>

          {/* Current state */}
          {cfg && (
            <div className="grid grid-cols-2 divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--panel)] sm:grid-cols-4 sm:divide-x">
              <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="label">Status</div>
                <div className="num mt-1.5 text-sm font-medium text-[var(--text)]">
                  {cfg.enabled ? "Enabled" : "Disabled"}
                </div>
              </div>
              <div className="border-l border-[var(--border)] px-4 py-3.5 sm:border-l-0 sm:px-5 sm:py-4">
                <div className="label">Threshold</div>
                <div className="num mt-1.5 text-sm font-medium text-[var(--text)]">
                  {money(cfg.threshold, currency)}/mo
                </div>
              </div>
              <div className="border-t border-[var(--border)] px-4 py-3.5 sm:border-t-0 sm:border-l sm:px-5 sm:py-4">
                <div className="label">Last projected</div>
                <div className="num mt-1.5 text-sm font-medium text-[var(--text)]">
                  {cfg.lastValue != null ? `${money(cfg.lastValue, currency)}/mo` : "—"}
                </div>
              </div>
              <div className="border-t border-l border-[var(--border)] px-4 py-3.5 sm:border-t-0 sm:px-5 sm:py-4">
                <div className="label">In breach</div>
                <div
                  className={
                    "num mt-1.5 text-sm font-medium " +
                    (cfg.triggered ? "text-[var(--up)]" : "text-[var(--text)]")
                  }
                >
                  {cfg.triggered ? "Yes" : "No"}
                </div>
                {cfg.lastNotifiedAt && (
                  <div className="num mt-0.5 text-xs text-[var(--muted)]">
                    notified {dayjs(cfg.lastNotifiedAt).format("YYYY-MM-DD HH:mm")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Config form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                webhookUrl: form.webhookUrl,
                threshold: Number(form.threshold),
                enabled: form.enabled,
              });
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5"
          >
            <div className="label mb-4">Alert rule</div>
            <div className="space-y-4">
              <div>
                <label className={label}>Webhook URL</label>
                <input
                  className={field}
                  required
                  type="url"
                  placeholder="https://hooks.slack.com/services/…"
                  value={form.webhookUrl}
                  onChange={(e) => set("webhookUrl", e.target.value)}
                />
                <div className="mt-1 text-xs text-[var(--faint)]">
                  Receives a JSON POST — works with Slack, Discord, and Mattermost incoming
                  webhooks.
                </div>
              </div>
              <div className="sm:max-w-xs">
                <label className={label}>Alert when projected €/mo exceeds</label>
                <input
                  className={`${field} num`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.threshold}
                  onChange={(e) => set("threshold", e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => set("enabled", e.target.checked)}
                />
                Alerting enabled
              </label>
              <button
                type="submit"
                disabled={save.isPending}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
            {save.isError && (
              <div className="mt-2 text-xs text-[var(--up)]">
                Couldn&apos;t save — check the webhook URL.
              </div>
            )}
            {save.isSuccess && <div className="mt-2 text-xs text-[var(--down)]">Saved.</div>}
          </form>
        </div>
      )}
    </AppShell>
  );
}
