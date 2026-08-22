"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SUPPORTED_CURRENCIES, transactionInputSchema } from "@fintrack/core";
import type { TransactionFormValues } from "@fintrack/core";
import { useCreateTransaction, useUpdateTransaction } from "../../hooks/use-transactions";
import { currencyMeta } from "../../lib/currencies";
import type { CategoryRow } from "../../lib/transactions/types";
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDefaults(): DefaultValues<TransactionFormValues> {
  // `amount` is intentionally omitted so the number field starts empty.
  return {
    currency: "EUR",
    type: "expense",
    label: "",
    categoryId: null,
    note: null,
    date: todayISO(),
  };
}

export function TransactionDialog({
  open,
  onOpenChange,
  categories,
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
  editId?: string | undefined;
  initialValues?: DefaultValues<TransactionFormValues> | undefined;
}) {
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionInputSchema),
    defaultValues: emptyDefaults(),
  });

  // Re-seed the form whenever the dialog opens (new/edit/duplicate).
  useEffect(() => {
    if (open) {
      reset(initialValues ?? emptyDefaults());
    }
  }, [open, initialValues, reset]);

  const onSubmit = handleSubmit((values) => {
    const settle = {
      onSuccess: () => {
        onOpenChange(false);
        reset(emptyDefaults());
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="currency" aria-label="Devise">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden>{currencyMeta(field.value).flag}</span>
                        {field.value}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => {
                        const meta = currencyMeta(c);
                        return (
                          <SelectItem key={c} value={c}>
                            <span aria-hidden>{meta.flag}</span>
                            <span className="font-medium">{c}</span>
                            <span className="text-muted-foreground">— {meta.name}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}

          <div className="space-y-2">
            <Label htmlFor="label">Libellé</Label>
            <Input id="label" placeholder="Ex. Courses, Salaire…" {...register("label")} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
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
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

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
