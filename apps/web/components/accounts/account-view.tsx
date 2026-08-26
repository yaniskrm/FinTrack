"use client";

import { useMemo, useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { calculateAccountBalances, formatCurrency } from "@fintrack/core";
import type { Account, AccountFormValues, Currency, Transaction } from "@fintrack/core";
import { useAccounts, useSetAccountActive } from "../../hooks/use-accounts";
import type { AccountRow } from "../../lib/accounts/types";
import type { TransactionRow } from "../../lib/transactions/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { AccountDialog } from "./account-dialog";

const TYPE_LABELS: Record<AccountRow["type"], string> = {
  checking: "Compte courant",
  savings: "Épargne",
  investment: "Investissement",
  cash: "Espèces",
  other: "Autre",
};

interface DialogState {
  open: boolean;
  editId?: string;
  initialValues?: DefaultValues<AccountFormValues>;
}

function toFormValues(account: AccountRow): DefaultValues<AccountFormValues> {
  return {
    name: account.name,
    type: account.type,
    currency: account.currency as Currency,
    initialBalance: account.initial_balance,
    icon: account.icon,
    color: account.color,
  };
}

export function AccountView({
  initialAccounts,
  transactions,
}: {
  initialAccounts: AccountRow[];
  /** All transactions — needed to compute each account's live balance. */
  transactions: TransactionRow[];
}) {
  const { data: accounts } = useAccounts(initialAccounts);
  const setActive = useSetAccountActive();

  const [dialog, setDialog] = useState<DialogState>({ open: false });

  const active = accounts.filter((a) => a.is_active);
  const archived = accounts.filter((a) => !a.is_active);

  // calculateAccountBalances only reads amount_eur/type/account_id/
  // to_account_id/initial_balance_eur; the DB rows' wider `currency: string`
  // is irrelevant here (same boundary cast as lib/dashboard.ts elsewhere).
  const balances = useMemo(
    () =>
      calculateAccountBalances(accounts as unknown as Account[], transactions as unknown as Transaction[]),
    [accounts, transactions],
  );

  function row(account: AccountRow) {
    const balance = balances.get(account.id) ?? 0;
    return (
      <div key={account.id} className="flex items-center gap-3 px-4 py-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
          style={{ backgroundColor: `${account.color}22` }}
          aria-hidden
        >
          {account.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{account.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {TYPE_LABELS[account.type]} · {account.currency}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(balance, "EUR")}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Modifier"
            onClick={() => {
              setDialog({ open: true, editId: account.id, initialValues: toFormValues(account) });
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={account.is_active ? "Archiver" : "Réactiver"}
            disabled={setActive.isPending}
            onClick={() => {
              setActive.mutate({ id: account.id, isActive: !account.is_active });
            }}
          >
            {account.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comptes</h1>
          <p className="text-sm text-muted-foreground">
            Répartissez vos transactions entre plusieurs comptes, ou archivez ceux que vous n&apos;utilisez
            plus.
          </p>
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

      <Card className="gap-0 divide-y py-0">{active.map(row)}</Card>

      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Archivés</p>
          <Card className="gap-0 divide-y py-0 opacity-60">{archived.map(row)}</Card>
        </div>
      )}

      <AccountDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((prev) => ({ ...prev, open }));
        }}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />
    </>
  );
}
