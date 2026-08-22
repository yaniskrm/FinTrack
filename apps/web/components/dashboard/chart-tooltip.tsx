"use client";

import { formatCurrency } from "@fintrack/core";

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

/** Shared Recharts tooltip content — values formatted as EUR, styled on tokens. */
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            {entry.color && (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            {entry.name && <span className="text-muted-foreground">{entry.name}</span>}
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
              {typeof entry.value === "number" ? formatCurrency(entry.value, "EUR") : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
