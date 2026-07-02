// Live-data indicator: a soft-pulsing accent dot.
export function Pulse({ label = "live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 label">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
      </span>
      {label}
    </span>
  );
}
