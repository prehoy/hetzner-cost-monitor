import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  authStatusOptions,
  projectsCreateMutation,
  projectsDeleteMutation,
  projectsListOptions,
  projectsListQueryKey,
  projectsToggleMutation,
} from "~/api";
import { AppShell } from "~/components/AppShell";

export const Route = createFileRoute("/projects")({
  beforeLoad: async ({ context }) => {
    const s = await context.queryClient.fetchQuery(authStatusOptions());
    if (!s.authenticated) throw redirect({ to: "/login" });
  },
  component: Projects,
});

function Projects() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: projectsListQueryKey() });
  const projects = useQuery(projectsListOptions());

  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const create = useMutation({
    ...projectsCreateMutation(),
    onSuccess: () => {
      setName("");
      setToken("");
      invalidate();
    },
  });
  const del = useMutation({ ...projectsDeleteMutation(), onSuccess: invalidate });
  const toggle = useMutation({ ...projectsToggleMutation(), onSuccess: invalidate });

  const field =
    "rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

  return (
    <AppShell>
      {() => (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({ body: { name, token } });
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5"
          >
            <div className="label mb-3">Add Hetzner project</div>
            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Project name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
              <input
                placeholder="Read API token"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={`${field} flex-1 min-w-[240px]`}
              />
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {create.isPending ? "Validating…" : "Add"}
              </button>
            </div>
            {create.isError && (
              <div className="mt-2 text-xs text-[var(--up)]">
                Token rejected — check it has read access.
              </div>
            )}
          </form>

          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="label px-4 py-2 text-left">Project</th>
                  <th className="label px-4 py-2 text-left">Last poll</th>
                  <th className="label px-4 py-2 text-left">Status</th>
                  <th className="label px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(projects.data?.projects ?? []).map((p: any) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-2.5 text-[var(--text)]">{p.name}</td>
                    <td className="num px-4 py-2.5 text-[var(--muted)]">
                      {p.lastPollAt ? new Date(p.lastPollAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.lastPollError ? (
                        <span className="text-[var(--up)]" title={p.lastPollError}>
                          error
                        </span>
                      ) : p.active ? (
                        <span className="text-[var(--down)]">active</span>
                      ) : (
                        <span className="text-[var(--muted)]">paused</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => toggle.mutate({ body: { id: p.id, active: !p.active } })}
                        className="mr-3 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        {p.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => del.mutate({ body: { id: p.id } })}
                        className="text-xs text-[var(--up)] hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {(projects.data?.projects ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                      No projects yet.
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
