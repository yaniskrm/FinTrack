import Link from "next/link";
import { formatCurrency } from "@fintrack/core";
import { createClient } from "../../../lib/supabase/server";
import { buildDashboard } from "../../../lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { StatTile } from "../../../components/dashboard/stat-tile";
import { HealthTile } from "../../../components/dashboard/health-tile";
import { BalanceSparkline } from "../../../components/dashboard/balance-sparkline";
import { CategoryDonut } from "../../../components/dashboard/category-donut";
import { MonthlyBars } from "../../../components/dashboard/monthly-bars";
import { UpcomingRecurring } from "../../../components/dashboard/upcoming-recurring";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: transactions }, { data: categories }, { data: upcoming }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("recurring_rules")
      .select("*")
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("next_occurrence", { ascending: true })
      .limit(5),
  ]);

  const data = buildDashboard(transactions ?? [], categories ?? []);
  const hasData = (transactions ?? []).length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble de vos finances.</p>
      </div>

      {!hasData ? (
        <>
          <Card className="items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Ajoutez des transactions pour voir vos statistiques ici.
            </p>
            <Button asChild>
              <Link href="/transactions">Ajouter une transaction</Link>
            </Button>
          </Card>
          <UpcomingRecurring rules={upcoming ?? []} categories={categories ?? []} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Solde"
              value={formatCurrency(data.totals.netBalance, "EUR")}
              tone={data.totals.netBalance >= 0 ? "income" : "expense"}
            >
              <BalanceSparkline data={data.sparkline} />
            </StatTile>
            <StatTile
              label="Revenus"
              value={formatCurrency(data.totals.totalIncome, "EUR")}
              tone="income"
            />
            <StatTile label="Dépenses" value={formatCurrency(data.totals.totalExpenses, "EUR")} />
            <HealthTile score={data.health.score} label={data.health.label} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDonut data={data.categories} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenus &amp; dépenses par mois</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyBars data={data.monthly} />
              </CardContent>
            </Card>

            <UpcomingRecurring rules={upcoming ?? []} categories={categories ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
