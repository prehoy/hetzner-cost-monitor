import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  authStatusOptions,
  backupConfigOptions,
  backupConfigQueryKey,
  backupListOptions,
  backupListQueryKey,
  backupRestoreMutation,
  backupRunMutation,
  backupSaveMutation,
} from "~/api";
import { AppShell } from "~/components/AppShell";

export const Route = createFileRoute("/backup")({
  beforeLoad: async ({ context }) => {
    const s = await context.queryClient.fetchQuery(authStatusOptions());
    if (!s.authenticated) throw redirect({ to: "/login" });
  },
  component: Backup,
});

const empty = {
  endpoint: "",
  region: "",
  bucket: "",
  prefix: "hacm",
  accessKeyId: "",
  secretAccessKey: "",
  intervalHours: 24,
  retention: 14,
  enabled: true,
};

function Backup() {
  const qc = useQueryClient();
  const cfgQuery = useQuery(backupConfigOptions());
  const cfg = (cfgQuery.data as any)?.config;
  const configured = (cfgQuery.data as any)?.configured;
  const listQuery = useQuery({ ...backupListOptions(), enabled: !!configured });
  const backups = ((listQuery.data as any)?.backups ?? []) as any[];

  const [form, setForm] = useState({ ...empty });
  useEffect(() => {
    if (cfg)
      setForm({
        endpoint: cfg.endpoint ?? "",
        region: cfg.region ?? "",
        bucket: cfg.bucket ?? "",
        prefix: cfg.prefix ?? "hacm",
        accessKeyId: cfg.accessKeyId ?? "",
        secretAccessKey: "",
        intervalHours: cfg.intervalHours ?? 24,
        retention: cfg.retention ?? 14,
        enabled: cfg.enabled ?? true,
      });
  }, [cfg]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: backupConfigQueryKey() });
    qc.invalidateQueries({ queryKey: backupListQueryKey() });
  };
  const save = useMutation({ ...backupSaveMutation(), onSuccess: refresh });
  const run = useMutation({ ...backupRunMutation(), onSuccess: refresh });
  const restore = useMutation({ ...backupRestoreMutation() });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const field =
    "w-full rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";
  const label = "label mb-1 block";

  return (
    <AppShell>
      {() => (
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            Back up the database (cost history, projects, overrides) to your own S3 bucket. Works with
            any S3-compatible provider — <span className="text-[var(--text)]">MinIO, Hetzner Object
            Storage, Cloudflare R2, Backblaze B2, AWS</span>. The secret key is encrypted at rest.
          </div>

          {/* Config form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ body: form });
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5"
          >
            <div className="label mb-4">S3 destination</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Bucket</label>
                <input className={field} required value={form.bucket} onChange={(e) => set("bucket", e.target.value)} />
              </div>
              <div>
                <label className={label}>Endpoint <span className="normal-case text-[var(--faint)]">(blank for AWS)</span></label>
                <input className={field} placeholder="https://s3.example.com" value={form.endpoint} onChange={(e) => set("endpoint", e.target.value)} />
              </div>
              <div>
                <label className={label}>Region</label>
                <input className={field} placeholder="auto / us-east-1" value={form.region} onChange={(e) => set("region", e.target.value)} />
              </div>
              <div>
                <label className={label}>Prefix (folder)</label>
                <input className={field} value={form.prefix} onChange={(e) => set("prefix", e.target.value)} />
              </div>
              <div>
                <label className={label}>Access key ID</label>
                <input className={field} required value={form.accessKeyId} onChange={(e) => set("accessKeyId", e.target.value)} />
              </div>
              <div>
                <label className={label}>Secret access key</label>
                <input
                  className={field}
                  type="password"
                  placeholder={configured ? "•••••• (leave blank to keep)" : ""}
                  value={form.secretAccessKey}
                  onChange={(e) => set("secretAccessKey", e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Every (hours)</label>
                <input className={`${field} num`} type="number" min={1} value={form.intervalHours} onChange={(e) => set("intervalHours", Number(e.target.value))} />
              </div>
              <div>
                <label className={label}>Keep (backups)</label>
                <input className={`${field} num`} type="number" min={1} value={form.retention} onChange={(e) => set("retention", Number(e.target.value))} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
                Automatic backups enabled
              </label>
              <button
                type="submit"
                disabled={save.isPending}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {save.isPending ? "Verifying…" : "Save"}
              </button>
            </div>
            {save.isError && (
              <div className="mt-2 text-xs text-[var(--up)]">
                Couldn&apos;t save — check the bucket and credentials.
              </div>
            )}
            {save.isSuccess && <div className="mt-2 text-xs text-[var(--down)]">Saved.</div>}
          </form>

          {/* Status + run now */}
          {configured && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
              <div className="text-sm">
                <div className="label">Last backup</div>
                {cfg?.lastBackupError ? (
                  <div className="text-[var(--up)]">Failed: {cfg.lastBackupError}</div>
                ) : cfg?.lastBackupAt ? (
                  <div className="num text-[var(--text)]">{dayjs(cfg.lastBackupAt).format("YYYY-MM-DD HH:mm")}</div>
                ) : (
                  <div className="text-[var(--muted)]">never</div>
                )}
              </div>
              <button
                onClick={() => run.mutate({})}
                disabled={run.isPending}
                className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                {run.isPending ? "Backing up…" : "Back up now"}
              </button>
            </div>
          )}

          {/* Backups list */}
          {configured && (
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="label py-2 px-3 text-left">Backup</th>
                    <th className="label py-2 px-3 text-right">Size</th>
                    <th className="label py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]">
                      <td className="num py-2 px-3 text-[var(--text)]">{b.key.split("/").pop()}</td>
                      <td className="num py-2 px-3 text-right text-[var(--muted)]">
                        {(b.size / 1024).toFixed(0)} KB
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Restore ${b.key.split("/").pop()}? The app must restart to apply.`))
                              restore.mutate({ body: { key: b.key } });
                          }}
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[var(--muted)]">
                        No backups yet — click “Back up now”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {restore.isSuccess && (
            <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--text)]">
              Restore staged. Restart the app (redeploy / restart the pod) to apply it.
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
