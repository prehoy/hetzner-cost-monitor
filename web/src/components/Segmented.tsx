import { cn } from "~/lib/cn";

type Opt<T extends string> = { value: T; label: string };

// Compact segmented control — the ledger's toggle for groupBy / range / VAT.
export function Segmented<T extends string>(props: {
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--panel-2)] p-0.5">
      {props.options.map((o) => (
        <button
          key={o.value}
          onClick={() => props.onChange(o.value)}
          className={cn(
            "px-2.5 py-1 text-xs rounded transition-colors",
            props.value === o.value
              ? "bg-[var(--panel)] text-[var(--text)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--text)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
