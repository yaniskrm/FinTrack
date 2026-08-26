"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { suggestCategoryId, transactionInputSchema } from "@fintrack/core";
import type { Currency, TransactionFormValues } from "@fintrack/core";
import { useCreateTransaction, useUpdateTransaction } from "../../hooks/use-transactions";
import type { CategoryRow, TransactionRow } from "../../lib/transactions/types";
import type { AccountRow } from "../../lib/accounts/types";
import { CurrencyCombobox } from "./currency-combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const TYPE_OPTIONS = [
  { value: "expense", label: "Dépense" },
  { value: "income", label: "Revenu" },
  { value: "transfer", label: "Transfert" },
] as const;

const NO_CATEGORY = "none";
const NO_DESTINATION = "none";
const LAST_ACCOUNT_KEY = "fintrack:lastAccountId";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The account a new transaction should default to — last used, else the first active account. */
function defaultAccountId(accounts: AccountRow[]): string {
  const active = accounts.filter((a) => a.is_active);
  const remembered = typeof window !== "undefined" ? window.localStorage.getItem(LAST_ACCOUNT_KEY) : null;
  if (remembered && active.some((a) => a.id === remembered)) return remembered;
  return active[0]?.id ?? accounts[0]?.id ?? "";
}

function rememberAccount(accountId: string): void {
  try {
    window.localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
  } catch {
    // Best-effort convenience only — a private window or full storage is fine to ignore.
  }
}

function emptyDefaults(defaultCurrency: Currency, accounts: AccountRow[]): DefaultValues<TransactionFormValues> {
  // `amount` is intentionally omitted so the number field starts empty.
  return {
    currency: defaultCurrency,
    type: "expense",
    label: "",
    merchant: null,
    categoryId: null,
    note: null,
    date: todayISO(),
    markAsReimbursable: false,
    reimbursementContact: null,
    accountId: defaultAccountId(accounts),
    toAccountId: null,
  };
}

export function TransactionDialog({
  open,
  onOpenChange,
  categories,
  transactions,
  accounts,
  defaultCurrency = "EUR",
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
  /** Recent transactions — powers the merchant autocomplete and category suggestion history. */
  transactions: TransactionRow[];
  accounts: AccountRow[];
  /** Pre-fills the currency field for a *new* transaction (workspace's "mode pays"). */
  defaultCurrency?: Currency;
  editId?: string | undefined;
  initialValues?: DefaultValues<TransactionFormValues> | undefined;
}) {
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const isPending = create.isPending || update.isPending;

  const visibleCategories = useMemo(() => categories.filter((c) => !c.hidden), [categories]);
  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
  const merchantHistory = useMemo(
    () => [...new Set(transactions.map((t) => t.merchant).filter((m): m is string => !!m))].sort(),
    [transactions],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionInputSchema),
    defaultValues: emptyDefaults(defaultCurrency, accounts),
  });

  // Re-seed the form whenever the dialog opens (new/edit/duplicate).
  // `defaultCurrency`/`accounts` are intentionally left out of the dependency
  // list — stable for the dialog's lifetime, and including them would re-seed
  // the form (fighting the user's own edits) on every unrelated re-render.
  useEffect(() => {
    if (open) {
      reset(initialValues ?? emptyDefaults(defaultCurrency, accounts));
    }
  }, [open, initialValues, reset]);

  const label = useWatch({ control, name: "label" });
  const merchant = useWatch({ control, name: "merchant" });
  const markAsReimbursable = useWatch({ control, name: "markAsReimbursable" });
  const type = useWatch({ control, name: "type" });
  const accountId = useWatch({ control, name: "accountId" });

  // Suggest a category once the user has typed enough to match — but never
  // override a category they already picked themselves. `categories` and
  // `transactions` are deliberately left out of the dependency list: they're
  // stable snapshots for the dialog's lifetime, only label/merchant edits
  // should re-run the suggestion.
  useEffect(() => {
    if (getValues("categoryId")) return;
    if (!label && !merchant) return;
    const suggested = suggestCategoryId(
      { label, merchant },
      categories,
      transactions.map((t) => ({ label: t.label, merchant: t.merchant, category_id: t.category_id })),
    );
    if (suggested) {
      setValue("categoryId", suggested, { shouldValidate: false });
    }
  }, [label, merchant]);

  // A transfer's destination can never be its own source — if the user
  // switches the source account to match the currently-picked destination,
  // clear the destination rather than leave an invalid pair on screen.
  useEffect(() => {
    if (getValues("toAccountId") === accountId) {
      setValue("toAccountId", null, { shouldValidate: false });
    }
  }, [accountId]);

  const onSubmit = handleSubmit((values) => {
    const settle = {
      onSuccess: () => {
        rememberAccount(values.accountId);
        onOpenChange(false);
        reset(emptyDefaults(defaultCurrency, accounts));
      },
    };
    if (editId) {
      update.mutate({ id: editId, values }, settle);
    } else {
      create.mutate(values, settle);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editId ? "Modifier la transaction" : "Nouvelle transaction"}</DialogTitle>
          <DialogDescription>
            {editId ? "Mettez à jour les détails." : "Ajoutez une dépense ou un revenu en quelques secondes."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0,00"
                autoFocus
                {...register("amount", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <CurrencyCombobox id="currency" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="account">{type === "transfer" ? "Depuis" : "Compte"}</Label>
              <Controller
                control={control}
                name="accountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="account">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.icon} {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {type === "transfer" && (
              <div className="space-y-2">
                <Label htmlFor="toAccount">Vers</Label>
                <Controller
                  control={control}
                  name="toAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? NO_DESTINATION}
                      onValueChange={(v) => {
                        field.onChange(v === NO_DESTINATION ? null : v);
                      }}
                    >
                      <SelectTrigger id="toAccount">
                        <SelectValue placeholder="Choisir…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DESTINATION} disabled>
                          Choisir…
                        </SelectItem>
                        {activeAccounts
                          .filter((acc) => acc.id !== accountId)
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.icon} {acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
          {errors.toAccountId && <p className="text-sm text-destructive">{errors.toAccountId.message}</p>}

          <div className="space-y-2">
            <Label htmlFor="label">Libellé</Label>
            <Input id="label" placeholder="Ex. Courses, Salaire…" {...register("label")} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant">Enseigne (optionnel)</Label>
            <Input
              id="merchant"
              list="merchant-history"
              placeholder="Ex. Carrefour, Uber…"
              {...register("merchant", { setValueAs: (v: string) => (v === "" ? null : v) })}
            />
            <datalist id="merchant-history">
              {merchantHistory.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NO_CATEGORY}
                  onValueChange={(v) => {
                    field.onChange(v === NO_CATEGORY ? null : v);
                  }}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Aucune</SelectItem>
                    {visibleCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {type === "expense" && (
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="size-4 accent-primary" {...register("markAsReimbursable")} />
                À rembourser (dépense avancée pour quelqu'un d'autre)
              </label>
              {markAsReimbursable && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="reimbursementContact">Contact (optionnel)</Label>
                  <Input
                    id="reimbursementContact"
                    placeholder="Ex. Alex"
                    {...register("reimbursementContact", { setValueAs: (v: string) => (v === "" ? null : v) })}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : editId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
