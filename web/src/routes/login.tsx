import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authLoginMutation, authRegisterMutation, authStatusOptions } from "~/api";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    const s = await context.queryClient.fetchQuery(authStatusOptions());
    if (s.authenticated) throw redirect({ to: "/" });
  },
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: status } = useQuery(authStatusOptions());
  const setup = status?.setupRequired ?? false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onDone = async () => {
    await qc.invalidateQueries();
    navigate({ to: "/" });
  };
  const login = useMutation({ ...authLoginMutation(), onSuccess: onDone });
  const register = useMutation({ ...authRegisterMutation(), onSuccess: onDone });
  const active = setup ? register : login;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    active.mutate({ body: { email, password } });
  };

  const field =
    "w-full rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6"
      >
        <div className="num text-lg font-semibold tracking-tight">HACM</div>
        <div className="mt-1 text-sm text-[var(--muted)]">
          {setup ? "Create the admin account" : "Sign in"}
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </div>
        </div>

        {active.isError && (
          <div className="mt-3 text-xs text-[var(--up)]">
            {setup ? "Registration failed." : "Invalid credentials."}
          </div>
        )}

        <button
          type="submit"
          disabled={active.isPending}
          className="mt-5 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {active.isPending ? "…" : setup ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
