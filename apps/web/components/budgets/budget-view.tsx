"use client";

import { useMemo, useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { calculateBudgetStatuses, calculateSavingsRate, formatCurrency } from "@fintrack/core";
import type { BudgetFormValues, BudgetStatus, Transaction } from "@fintrack/core";
import { useBudgets, useDeleteBudget } from "../../hooks/use-budgets";
import type { BudgetRow } from "../../lib/budgets/types";
import type { CategoryRow, TransactionRow } from "../../lib/transactions/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { BudgetDialog } from "./budget-dialog";

const PERIOD_LABELS: Record<BudgetRow["period"], string> = {
  monthly: "ce mois-ci",
  yearly: "cette année",
};

const RECOMMENDED_SAVINGS_RATE = 20; // 50/30/20 rule

interface DialogState {
  open: boolean;
  editId?: string;
  initialValues?: DefaultValues<BudgetFormValues>;
}

function toFormValues(budget: BudgetRow): DefaultValues<BudgetFormValues> {
  return { categoryId: budget.category_id, amountEur: budget.amount_eur, period: budget.period };
}

function barColor(status: BudgetStatus): string {
  if (status.isExceeded) return "var(--destructive)";
  if (status.isWarning) return "var(--chart-3)";
  return "var(--success)";
}

function currentPeriodBounds(): { startOfMonth: string; startOfYear: string } {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
  return { startOfMonth, startOfYear };
}

export function BudgetView({
  initialBudgets,
  initialCategories,
  transactions,
}: {
  initialBudgets: BudgetRow[];
  initialCategories: CategoryRow[];
  /** Current-year transactions — enough to cover both monthly and yearly budgets. */
  transactions: TransactionRow[];
}) {
  const { data: budgets } = useBudgets(initialBudgets);
  const deleteBudget = useDeleteBudget();

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const categoryById = useMemo(
    () => new Map(initialCategories.map((c) => [c.id, c])),
    [initialCategories],
  );

  // calculateBudgetStatuses/calculateSavingsRate only read amount_eur/type/
  // date/category_id; the DB row's wider `currency: string` is irrelevant
  // here, so this boundary cast is safe (see lib/dashboard.ts).
  const coreTransactions = transactions as unknown as Transaction[];

  const statuses = useMemo(() => {
    const { startOfMonth, startOfYear } = currentPeriodBounds();
    const monthly = budgets.filter((b) => b.period === "monthly");
    const yearly = budgets.filter((b) => b.period === "yearly");
    const monthlyTx = coreTransactions.filter((tx) => tx.date >= startOfMonth);
    const yearlyTx = coreTransactions.filter((tx) => tx.date >= startOfYear);

    const byId = new Map<string, BudgetStatus>();
    for (const s of calculateBudgetStatuses(monthly, monthlyTx)) byId.set(s.budget.id, s);
    for (const s of calculateBudgetStatuses(yearly, yearlyTx)) byId.set(s.budget.id, s);

    // Highest consumption first — surfaces alerts immediately.
    return budgets
      .map((b) => byId.get(b.id))
      .filter((s): s is BudgetStatus => s !== undefined)
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets, coreTransactions]);

  const savingsRate = useMemo(() => calculateSavingsRate(coreTransactions), [coreTransactions]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">Enveloppes de dépenses par catégorie.</p>
        </div>
        <Button
          onClick={() => {
            setDialog({ open: true });
          }}
        >
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      <Card className="flex-row items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">Taux d&apos;épargne (cette année)</p>
          <p
            className="text-xl font-semibold tabular-nums"
            style={{ color: savingsRate >= RECOMMENDED_SAVINGS_RATE ? "var(--success)" : "var(--destructive)" }}
          >
            {savingsRate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%
          </p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          Recommandé : {RECOMMENDED_SAVINGS_RATE}% minimum
          <br />
          (règle des 50/30/20)
        </p>
      </Card>

      {statuses.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun budget défini — aucune barre n&apos;est affichée tant qu&apos;une catégorie n&apos;a pas
            d&apos;enveloppe.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setDialog({ open: true });
            }}
          >
            <Plus className="size-4" />
            Créer le premier
          </Button>
        </Card>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {statuses.map((status) => {
            const budget = status.budget;
            const category = categoryById.get(budget.category_id);
            const color = barColor(status);
            return (
              <div key={budget.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: `${category?.color ?? "#8883"}22` }}
                  aria-hidden
                >
                  {category?.icon ?? <Wallet className="size-4 text-muted-foreground" />}
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{category?.name ?? "Catégorie"}</p>
                    <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(status.spent, "EUR")} / {formatCurrency(budget.amount_eur, "EUR")}{" "}
                      {PERIOD_LABELS[budget.period]}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${String(Math.min(100, status.percentage))}%`, backgroundColor: color }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {confirmingDeleteId === budget.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteBudget.isPending}
                        onClick={() => {
                          deleteBudget.mutate(budget.id);
                          setConfirmingDeleteId(null);
                        }}
                      >
                        Supprimer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmingDeleteId(null);
                        }}
                      >
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Modifier"
                        onClick={() => {
                          setDialog({ open: true, editId: budget.id, initialValues: toFormValues(budget) });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => {
                          setConfirmingDeleteId(budget.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <BudgetDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((prev) => ({ ...prev, open }));
        }}
        categories={initialCategories}
        transactions={transactions}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />
    </div>
  );
}
