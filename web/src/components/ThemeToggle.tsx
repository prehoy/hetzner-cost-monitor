import type { ThemeMode } from "~/lib/theme";
import { cn } from "~/lib/cn";

// Clear 3-way switcher: Auto / Light / Dark, active segment highlighted, each
// labelled for a11y + tooltip. Beats the old single mystery-glyph cycle button.
const OPTIONS: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: "system",
    label: "Auto",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    mode: "light",
    label: "Light",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    mode: "dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function ThemeToggle({
  mode,
  onSelect,
}: {
  mode: ThemeMode;
  onSelect: (m: ThemeMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-md border border-[var(--border)] bg-[var(--panel-2)] p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = mode === o.mode;
        return (
          <button
            key={o.mode}
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={`${o.label} theme`}
            onClick={() => onSelect(o.mode)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded px-2 transition-colors",
              active
                ? "bg-[var(--panel)] text-[var(--text)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text)]",
            )}
          >
            {o.icon}
            {/* label shows on the active one (and always ≥sm) for clarity */}
            <span className={cn("text-xs", active ? "inline" : "hidden sm:inline")}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
