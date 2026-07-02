import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { authLogoutMutation } from "~/api";
import { useTheme } from "~/lib/theme";
import { cn } from "~/lib/cn";
import { Pulse } from "./Pulse";
import { ThemeToggle } from "./ThemeToggle";

// App chrome: ledger header + routed content. Exposes the resolved theme to
// children (the chart needs it) via a render prop.
export function AppShell({ children }: { children: (theme: "light" | "dark") => ReactNode }) {
  const { mode, resolved, cycle } = useTheme();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const logout = useMutation({
    ...authLogoutMutation(),
    onSuccess: () => navigate({ to: "/login" }),
  });

  const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className={cn(
        "px-2 py-1 text-sm rounded transition-colors",
        path === to ? "text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <div className="flex items-baseline gap-2">
            <span className="num text-base font-semibold tracking-tight text-[var(--text)]">
              HACM
            </span>
            <span className="hidden text-xs text-[var(--muted)] sm:inline">
              Hetzner cost monitoring
            </span>
          </div>
          <Pulse />
          <nav className="ml-4 flex items-center gap-1">
            <NavLink to="/" label="Explorer" />
            <NavLink to="/pricing" label="Pricing" />
            <NavLink to="/projects" label="Projects" />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle mode={mode} onCycle={cycle} />
            <button
              onClick={() => logout.mutate({})}
              className="rounded-md border border-[var(--border)] bg-[var(--panel-2)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children(resolved)}</main>
    </div>
  );
}
