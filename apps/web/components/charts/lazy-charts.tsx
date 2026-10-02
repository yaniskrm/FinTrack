"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

// Recharts is the heaviest dependency of the dashboard and investments pages.
// These wrappers load each chart on demand (client-side only — Recharts'
// ResponsiveContainer renders nothing on the server anyway, it needs to measure
// the DOM), keeping Recharts out of those pages' initial JavaScript. Each
// skeleton reproduces the chart's own box so the layout doesn't jump when the
// chunk arrives.

function ChartSkeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export const BalanceSparkline = dynamic(
  () => import("../dashboard/balance-sparkline").then((m) => m.BalanceSparkline),
  { ssr: false, loading: () => <ChartSkeleton className="h-20 w-full" /> },
);

export const CategoryDonut = dynamic(
  () => import("../dashboard/category-donut").then((m) => m.CategoryDonut),
  { ssr: false, loading: () => <ChartSkeleton className="mx-auto h-44 w-44 sm:mx-0" /> },
);

export const MonthlyBars = dynamic(
  () => import("../dashboard/monthly-bars").then((m) => m.MonthlyBars),
  { ssr: false, loading: () => <ChartSkeleton className="h-64 w-full" /> },
);

const AllocationDonutLazy = dynamic(
  () => import("../investments/allocation-donut").then((m) => m.AllocationDonut),
  { ssr: false, loading: () => <ChartSkeleton className="mx-auto h-44 w-44 sm:mx-0" /> },
);

/**
 * `AllocationDonut` is generic over its slice key, and `next/dynamic` erases
 * generics. This thin wrapper keeps callers type-checked against their own key
 * type (e.g. an enum of asset types); the single cast below is safe because the
 * props are forwarded untouched to the very same component.
 */
export function AllocationDonut<K extends string>(props: {
  slices: { key: K; valueEur: number; percentage: number }[];
  labelOf: (key: K) => string;
}) {
  return <AllocationDonutLazy {...(props as unknown as ComponentProps<typeof AllocationDonutLazy>)} />;
}

export const PerformanceChart = dynamic(
  () => import("../investments/performance-chart").then((m) => m.PerformanceChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-64 w-full" /> },
);
