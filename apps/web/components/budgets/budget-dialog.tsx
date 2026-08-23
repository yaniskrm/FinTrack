"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetInputSchema, suggestBudgetAmount } from "@fintrack/core";
import type { BudgetFormValues, Transaction } from "@fintrack/core";
import { useCreateBudget, useUpdateBudget } from "../../hooks/use-budgets";
import type { CategoryRow, TransactionRow } from "../../lib/transactions/types";
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

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Mensuel" },
  { value: "yearly", label: "Annuel" },
] as const;

function emptyDefaults(categories: CategoryRow[]): DefaultValues<BudgetFormValues> {
  const first = categories[0];
  return {
    ...(first ? { categoryId: first.id } : {}),
    period: "monthly",
  };
}

export function BudgetDialog({
  open,
  onOpenChange,
  categories,
  transactions,
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
  /** Recent transactions, used to compute the 3-month spending suggestion. */
  transactions: TransactionRow[];
  editId?: string | undefined;
  initialValues?: DefaultValues<BudgetFormValues> | undefined;
}) {
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetInputSchema),
    defaultValues: emptyDefaults(categories),
  });

  // categories is stable for the component's lifetime (server-fetched once),
  // so it's intentionally left out of the dependency list below.
  useEffect(() => {
    if (open) {
      reset(initialValues ?? emptyDefaults(categories));
    }
  }, [open, initialValues, reset]);

  const selectedCategoryId = watch("categoryId");
  // suggestBudgetAmount only reads amount_eur/type/date/category_id; the DB
  // row's wider `currency: string` is irrelevant here (see lib/dashboard.ts).
  const suggestion = selectedCategoryId
    ? suggestBudgetAmount(selectedCategoryId, transactions as unknown as Transaction[])
    : 0;

  const onSubmit = handleSubmit((values) => {
    const settle = {
      onSuccess: () => {
        onOpenChange(false);
        reset(emptyDefaults(categories));
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
          <DialogTitle>{editId ? "Modifier le budget" : "Nouveau budget"}</DialogTitle>
          <DialogDescription>
            Une enveloppe de dépenses par catégorie, suivie automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="grid gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(editId)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amountEur">Montant (EUR)</Label>
              <Input
                id="amountEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0,00"
                autoFocus
                {...register("amountEur", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Période</Label>
              <Controller
                control={control}
                name="period"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          {errors.amountEur && <p className="text-sm text-destructive">{errors.amountEur.message}</p>}

          {suggestion > 0 && (
            <button
              type="button"
              onClick={() => {
                setValue("amountEur", suggestion, { shouldValidate: true });
              }}
              className="text-left text-sm text-muted-foreground"
            >
              Suggestion (moyenne des 3 derniers mois) :{" "}
              <span className="font-medium text-foreground underline underline-offset-4 decoration-primary">
                {suggestion.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </button>
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
