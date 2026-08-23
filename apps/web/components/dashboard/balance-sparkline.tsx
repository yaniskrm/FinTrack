"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@fintrack/core";

interface Point {
  date: string;
  balance: number;
}

function SparkTooltip({ active, payload }: { active?: boolean; payload?: { payload?: Point }[] }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">
        {new Date(`${point.date}T00:00:00`).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>
      <p className="font-medium tabular-nums text-foreground">
        {formatCurrency(point.balance, "EUR")}
      </p>
    </div>
  );
}

export function BalanceSparkline({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return null;
  }

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={<SparkTooltip />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#sparkFill)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
