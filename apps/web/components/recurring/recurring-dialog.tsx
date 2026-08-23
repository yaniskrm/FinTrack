"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recurringInputSchema } from "@fintrack/core";
import type { RecurringFormValues } from "@fintrack/core";
import { useCreateRecurringRule, useUpdateRecurringRule } from "../../hooks/use-recurring";
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
import { CurrencyCombobox } from "../transactions/currency-combobox";

const TYPE_OPTIONS = [
  { value: "expense", label: "Dépense" },
  { value: "income", label: "Revenu" },
  { value: "transfer", label: "Transfert" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Quotidien" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
  { value: "yearly", label: "Annuel" },
] as const;

const NO_CATEGORY = "none";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDefaults(): DefaultValues<RecurringFormValues> {
  return {
    currency: "EUR",
    type: "expense",
    label: "",
    categoryId: null,
    frequency: "monthly",
    startDate: todayISO(),
    endDate: null,
  };
}

export function RecurringDialog({
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
  initialValues?: DefaultValues<RecurringFormValues> | undefined;
}) {
  const create = useCreateRecurringRule();
  const update = useUpdateRecurringRule();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringInputSchema),
    defaultValues: emptyDefaults(),
  });

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
          <DialogTitle>{editId ? "Modifier l'abonnement" : "Nouvel abonnement"}</DialogTitle>
          <DialogDescription>
            Une règle récurrente génère automatiquement les transactions à chaque échéance.
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
              <Label htmlFor="frequency">Fréquence</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
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

          <div className="grid grid-cols-[1fr_9rem] gap-3">
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

          <div className="space-y-2">
            <Label htmlFor="label">Libellé</Label>
            <Input id="label" placeholder="Ex. Netflix, Loyer, Salaire…" {...register("label")} />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Début</Label>
              <Input id="startDate" type="date" disabled={Boolean(editId)} {...register("startDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fin (optionnel)</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate", { setValueAs: (v: string) => (v === "" ? null : v) })}
              />
            </div>
          </div>
          {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}

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
