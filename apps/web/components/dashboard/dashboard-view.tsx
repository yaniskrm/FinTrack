"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@fintrack/core";
import { buildDashboard } from "../../lib/dashboard";
import type { CategoryRow, TransactionRow } from "../../lib/transactions/types";
import type { AccountRow } from "../../lib/accounts/types";
import type { RecurringRuleRow } from "../../lib/recurring/types";
import type { InvestmentRow } from "../../lib/investments/types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { StatTile } from "./stat-tile";
import { HealthTile } from "./health-tile";
import { BalanceSparkline } from "./balance-sparkline";
import { CategoryDonut } from "./category-donut";
import { MonthlyBars } from "./monthly-bars";
import { UpcomingRecurring } from "./upcoming-recurring";
import { NetWorthTile } from "./net-worth-tile";

const ALL_ACCOUNTS = "all";

export function DashboardView({
  transactions,
  categories,
  accounts,
  upcoming,
  investments,
}: {
  transactions: TransactionRow[];
  categories: CategoryRow[];
  accounts: AccountRow[];
  upcoming: RecurringRuleRow[];
  /** Investments aren't tied to a bank account — always shown in full, unaffected by the filter below. */
  investments: InvestmentRow[];
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(ALL_ACCOUNTS);

  // A transfer touches two accounts — filtering to one of them still counts
  // it, same convention as the transactions list (see transactions-view.tsx).
  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === ALL_ACCOUNTS) return transactions;
    return transactions.filter(
      (tx) => tx.account_id === selectedAccountId || tx.to_account_id === selectedAccountId,
    );
  }, [transactions, selectedAccountId]);

  const filteredUpcoming = useMemo(() => {
    if (selectedAccountId === ALL_ACCOUNTS) return upcoming;
    return upcoming.filter(
      (rule) => rule.account_id === selectedAccountId || rule.to_account_id === selectedAccountId,
    );
  }, [upcoming, selectedAccountId]);

  const data = useMemo(
    () => buildDashboard(filteredTransactions, categories),
    [filteredTransactions, categories],
  );
  const hasData = filteredTransactions.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d&apos;ensemble de vos finances.</p>
        </div>
        {accounts.length > 0 && (
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger aria-label="Compte" className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ACCOUNTS}>Tous les comptes</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
          <div className="grid gap-4 lg:grid-cols-2">
            <UpcomingRecurring rules={filteredUpcoming} categories={categories} />
            <NetWorthTile investments={investments} />
          </div>
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

            <UpcomingRecurring rules={filteredUpcoming} categories={categories} />
            <NetWorthTile investments={investments} />
          </div>
        </>
      )}
    </div>
  );
}
