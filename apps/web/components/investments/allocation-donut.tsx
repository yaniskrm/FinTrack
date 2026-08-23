"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@fintrack/core";
import { ChartTooltip } from "../dashboard/chart-tooltip";

const CHART_SLOTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function AllocationDonut<K extends string>({
  slices,
  labelOf,
}: {
  slices: { key: K; valueEur: number; percentage: number }[];
  labelOf: (key: K) => string;
}) {
  if (slices.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune position ouverte à répartir.</p>;
  }

  const data = slices.map((slice, i) => ({
    name: labelOf(slice.key),
    value: slice.valueEur,
    percentage: slice.percentage,
    color: CHART_SLOTS[i % CHART_SLOTS.length] ?? "var(--chart-1)",
  }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(total, "EUR")}
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="truncate text-muted-foreground">{slice.name}</span>
            <span className="ml-auto shrink-0 font-medium tabular-nums text-foreground">
              {formatCurrency(slice.value, "EUR")}
            </span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(slice.percentage)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
