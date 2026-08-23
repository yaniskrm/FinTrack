import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { calculatePortfolioSummary, formatCurrency } from "@fintrack/core";
import type { Investment } from "@fintrack/core";
import type { InvestmentRow } from "../../lib/investments/types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/** "Encart patrimoine" — a compact link out to the full investments module. */
export function NetWorthTile({ investments }: { investments: InvestmentRow[] }) {
  if (investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-muted-foreground" />
            Patrimoine
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">Aucune position d&apos;investissement pour le moment.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/investments">
              Ajouter une position
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // DB row `currency: string` is wider than core's `Currency` union — same
  // documented boundary cast as lib/dashboard.ts.
  const summary = calculatePortfolioSummary(investments as unknown as Investment[]);
  const positive = summary.totalUnrealizedPnlEur >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-muted-foreground" />
          Patrimoine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(summary.totalCurrentValueEur, "EUR")}
          </p>
          <span className={cn("text-sm font-medium tabular-nums", positive ? "text-success" : "text-destructive")}>
            {positive ? "+" : ""}
            {summary.totalUnrealizedPnlPercent.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {summary.openPositionsCount} position{summary.openPositionsCount > 1 ? "s" : ""} ouverte
          {summary.openPositionsCount > 1 ? "s" : ""}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/investments">
            Voir le portefeuille
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
