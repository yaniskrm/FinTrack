"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPoint } from "../../lib/dashboard";
import { ChartTooltip } from "./chart-tooltip";

function compactEur(value: number): string {
  if (value >= 1000) return `${String(Math.round(value / 100) / 10)} k€`;
  return `${String(Math.round(value))} €`;
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

export function MonthlyBars({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Pas encore de données mensuelles.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={axisTick}
            tickFormatter={compactEur}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
          <Bar dataKey="income" name="Revenus" fill="var(--chart-income)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Dépenses" fill="var(--chart-expense)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
