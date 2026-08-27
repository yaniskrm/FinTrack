"use client";

import { useEffect, useMemo, useState } from "react";
import type { DefaultValues } from "react-hook-form";
import Link from "next/link";
import { ArrowLeftRight, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { calculateOutstandingReimbursements, calculateTotals, formatCurrency } from "@fintrack/core";
import type { Currency, Transaction, TransactionFormValues } from "@fintrack/core";
import {
  useCategories,
  useDeleteTransaction,
  useSettleReimbursement,
  useTransactions,
} from "../../hooks/use-transactions";
import { useAccounts } from "../../hooks/use-accounts";
import type { CategoryRow, TransactionRow } from "../../lib/transactions/types";
import type { AccountRow } from "../../lib/accounts/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";
import { TransactionDialog } from "./transaction-dialog";

const ALL_ACCOUNTS = "all";

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
    merchant: row.merchant,
    categoryId: row.category_id,
    note: row.note,
    date: row.date,
    markAsReimbursable: row.reimbursement_status !== "none",
    reimbursementContact: row.reimbursement_contact,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string): string {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function TransactionsView({
  initialTransactions,
  initialCategories,
  initialAccounts,
  defaultCurrency = "EUR",
}: {
  initialTransactions: TransactionRow[];
  initialCategories: CategoryRow[];
  initialAccounts: AccountRow[];
  defaultCurrency?: Currency;
}) {
  const { data: transactions } = useTransactions(initialTransactions);
  const { data: categories } = useCategories(initialCategories);
  const { data: accounts } = useAccounts(initialAccounts);
  const deleteTransaction = useDeleteTransaction();
  const settleReimbursement = useSettleReimbursement();

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => monthKey(new Date().toISOString()));
  const [selectedAccountId, setSelectedAccountId] = useState<string>(ALL_ACCOUNTS);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // A transfer touches two accounts — filtering to one of them still shows
  // it (money either left or arrived there), same as a real bank statement.
  const accountFilteredTransactions = useMemo(() => {
    if (selectedAccountId === ALL_ACCOUNTS) return transactions;
    return transactions.filter(
      (tx) => tx.account_id === selectedAccountId || tx.to_account_id === selectedAccountId,
    );
  }, [transactions, selectedAccountId]);

  const monthTransactions = useMemo(
    () => accountFilteredTransactions.filter((tx) => monthKey(tx.date) === month),
    [accountFilteredTransactions, month],
  );

  const monthTotals = useMemo(
    () => calculateTotals(monthTransactions as unknown as Transaction[]),
    [monthTransactions],
  );

  const reimbursements = useMemo(
    () => calculateOutstandingReimbursements(accountFilteredTransactions as unknown as Transaction[]),
    [accountFilteredTransactions],
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
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/transactions/import">
              <Upload className="size-4" />
              Importer
            </Link>
          </Button>
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
      </div>

      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
        <SelectTrigger aria-label="Compte" className="w-full">
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

      {reimbursements.items.length > 0 && (
        <Card className="gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Remboursements en attente</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(reimbursements.totalOutstandingEur, "EUR")}
            </p>
          </div>
          <ul className="space-y-1.5">
            {reimbursements.items.map(({ transaction: tx }) => (
              <li key={tx.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">
                  {tx.label}
                  {tx.reimbursement_contact ? ` · ${tx.reimbursement_contact}` : ""}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-foreground">{formatCurrency(tx.amount_eur, "EUR")}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={settleReimbursement.isPending}
                    onClick={() => {
                      settleReimbursement.mutate(tx.id);
                    }}
                  >
                    Marquer remboursé
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mois précédent"
          onClick={() => {
            setMonth((m) => shiftMonth(m, -1));
          }}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium capitalize">{monthLabel(month)}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mois suivant"
          onClick={() => {
            setMonth((m) => shiftMonth(m, 1));
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Revenus</p>
          <p className="text-sm font-semibold tabular-nums text-success">
            {formatCurrency(monthTotals.totalIncome, "EUR")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Dépenses</p>
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(monthTotals.totalExpenses, "EUR")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Solde net</p>
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              monthTotals.netBalance >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatCurrency(monthTotals.netBalance, "EUR")}
          </p>
        </div>
      </div>

      {monthTransactions.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune transaction ce mois-ci.</p>
          <Button
            variant="outline"
            onClick={() => {
              setDialog({ open: true });
            }}
          >
            <Plus className="size-4" />
            Ajouter
          </Button>
        </Card>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {monthTransactions.map((tx) => {
            const category = tx.category_id ? categoryById.get(tx.category_id) : undefined;
            const account = accountById.get(tx.account_id);
            const toAccount = tx.to_account_id ? accountById.get(tx.to_account_id) : undefined;
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
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {tx.label}
                    {tx.reimbursement_status !== "none" && (
                      <span
                        aria-label={
                          tx.reimbursement_status === "pending" ? "En attente de remboursement" : "Remboursé"
                        }
                        title={tx.reimbursement_status === "pending" ? "En attente de remboursement" : "Remboursé"}
                        className={cn(
                          "inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                          tx.reimbursement_status === "settled" && "text-success",
                        )}
                        style={tx.reimbursement_status === "pending" ? { color: "var(--chart-3)" } : undefined}
                      >
                        <ArrowLeftRight className="size-3" />
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tx.type === "transfer"
                      ? `${account?.icon ?? ""} ${account?.name ?? "?"} → ${toAccount?.icon ?? ""} ${toAccount?.name ?? "?"}`
                      : category?.name ?? "Sans catégorie"}
                    {" · "}
                    {selectedAccountId === ALL_ACCOUNTS && tx.type !== "transfer" && account
                      ? `${account.name} · `
                      : ""}
                    {formatDate(tx.date)}
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
        transactions={transactions}
        accounts={accounts}
        defaultCurrency={defaultCurrency}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />
    </div>
  );
}
