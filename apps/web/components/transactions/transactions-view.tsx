"use client";

import { useEffect, useMemo, useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@fintrack/core";
import type { Currency, TransactionFormValues } from "@fintrack/core";
import {
  useCategories,
  useDeleteTransaction,
  useTransactions,
} from "../../hooks/use-transactions";
import type { CategoryRow, TransactionRow } from "../../lib/transactions/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";
import { TransactionDialog } from "./transaction-dialog";

interface DialogState {
  open: boolean;
  editId?: string;
  initialValues?: DefaultValues<TransactionFormValues>;
}

function toFormValues(row: TransactionRow): DefaultValues<TransactionFormValues> {
  return {
    amount: row.amount,
    currency: row.currency as Currency,
    type: row.type,
    label: row.label,
    categoryId: row.category_id,
    note: row.note,
    date: row.date,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TransactionsView({
  initialTransactions,
  initialCategories,
}: {
  initialTransactions: TransactionRow[];
  initialCategories: CategoryRow[];
}) {
  const { data: transactions } = useTransactions(initialTransactions);
  const { data: categories } = useCategories(initialCategories);
  const deleteTransaction = useDeleteTransaction();

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Keyboard shortcut: "n" opens the quick-entry dialog (unless typing).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if (!typing && (e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setDialog({ open: true });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {transactions.length} opération{transactions.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            setDialog({ open: true });
          }}
        >
          <Plus className="size-4" />
          Ajouter
          <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1.5 text-xs sm:inline">
            N
          </kbd>
        </Button>
      </div>

      {transactions.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune transaction pour le moment.</p>
          <Button
            variant="outline"
            onClick={() => {
              setDialog({ open: true });
            }}
          >
            <Plus className="size-4" />
            Ajouter la première
          </Button>
        </Card>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {transactions.map((tx) => {
            const category = tx.category_id ? categoryById.get(tx.category_id) : undefined;
            const sign = tx.type === "expense" ? "-" : tx.type === "income" ? "+" : "";
            return (
              <div key={tx.id} className="group flex items-center gap-3 px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: `${category?.color ?? "#8883"}22` }}
                  aria-hidden
                >
                  {category?.icon ?? "•"}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {category?.name ?? "Sans catégorie"} · {formatDate(tx.date)}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      tx.type === "income" && "text-success",
                      tx.type === "expense" && "text-foreground",
                    )}
                  >
                    {sign}
                    {formatCurrency(tx.amount, tx.currency as Currency)}
                  </p>
                  {tx.currency !== "EUR" && !tx.id.startsWith("optimistic-") && (
                    <p
                      className="text-xs text-muted-foreground tabular-nums"
                      title={
                        tx.rate_approximate
                          ? "Taux approximatif : le taux de change n'était pas à jour au moment de la saisie."
                          : undefined
                      }
                    >
                      {tx.rate_approximate ? "≈ " : ""}
                      {formatCurrency(tx.amount_eur, "EUR")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  {confirmingDeleteId === tx.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteTransaction.isPending}
                        onClick={() => {
                          deleteTransaction.mutate(tx.id);
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
                          setDialog({ open: true, editId: tx.id, initialValues: toFormValues(tx) });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Dupliquer"
                        onClick={() => {
                          setDialog({ open: true, initialValues: toFormValues(tx) });
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => {
                          setConfirmingDeleteId(tx.id);
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

      <TransactionDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((prev) => ({ ...prev, open }));
        }}
        categories={categories}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />
    </div>
  );
}
