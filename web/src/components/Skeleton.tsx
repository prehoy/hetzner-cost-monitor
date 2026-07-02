import { cn } from "~/lib/cn";

// Tailwind pulse shimmer in a theme-aware tone.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[var(--border)]", className)} />;
}
