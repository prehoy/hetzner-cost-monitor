import type { ThemeMode } from "~/lib/theme";

const GLYPH: Record<ThemeMode, string> = { system: "◐", light: "☀", dark: "☾" };

export function ThemeToggle({ mode, onCycle }: { mode: ThemeMode; onCycle: () => void }) {
  return (
    <button
      onClick={onCycle}
      title={`Theme: ${mode} (click to change)`}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--text)]"
    >
      <span className="text-sm leading-none">{GLYPH[mode]}</span>
    </button>
  );
}
