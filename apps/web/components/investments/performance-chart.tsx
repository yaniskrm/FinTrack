"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PortfolioHistoryPoint } from "@fintrack/core";
import { ChartTooltip } from "../dashboard/chart-tooltip";

function compactEur(value: number): string {
  if (value >= 1000) return `${String(Math.round(value / 100) / 10)} k€`;
  return `${String(Math.round(value))} €`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

export function PerformanceChart({ data }: { data: PortfolioHistoryPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Ajoutez au moins deux valorisations pour afficher la courbe de performance.
      </p>
    );
  }

  const chartData = data.map((point) => ({ date: formatDate(point.date), Valeur: point.totalValueEur }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisTick} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} tickFormatter={compactEur} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="Valeur"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#performanceFill)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
