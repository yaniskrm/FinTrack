import Link from "next/link";
import { Repeat } from "lucide-react";
import { formatCurrency } from "@fintrack/core";
import type { Currency } from "@fintrack/core";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { RecurringRuleRow } from "../../lib/recurring/types";
import type { CategoryRow } from "../../lib/transactions/types";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function UpcomingRecurring({
  rules,
  categories,
}: {
  rules: RecurringRuleRow[];
  categories: CategoryRow[];
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prochains prélèvements</CardTitle>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun abonnement à venir.{" "}
            <Link href="/subscriptions" className="font-medium text-foreground underline underline-offset-4 decoration-primary hover:decoration-2">
              En créer un
            </Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => {
              const category = rule.category_id ? categoryById.get(rule.category_id) : undefined;
              const sign = rule.type === "expense" ? "-" : rule.type === "income" ? "+" : "";
              return (
                <li key={rule.id} className="flex items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: `${category?.color ?? "#8883"}22` }}
                    aria-hidden
                  >
                    {category?.icon ?? <Repeat className="size-3.5 text-muted-foreground" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{rule.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(rule.next_occurrence)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {sign}
                    {formatCurrency(rule.amount, rule.currency as Currency)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
