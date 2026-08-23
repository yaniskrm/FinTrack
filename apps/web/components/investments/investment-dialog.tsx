"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { investmentInputSchema } from "@fintrack/core";
import type { InvestmentFormValues, InvestmentType } from "@fintrack/core";
import { useCreateInvestment, useUpdateInvestment } from "../../hooks/use-investments";
import { CurrencyCombobox } from "../transactions/currency-combobox";
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

const ASSET_TYPE_OPTIONS: { value: InvestmentType; label: string }[] = [
  { value: "etf", label: "ETF" },
  { value: "stock", label: "Action" },
  { value: "scpi", label: "SCPI" },
  { value: "savings", label: "Livret" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Autre" },
];

function emptyDefaults(): DefaultValues<InvestmentFormValues> {
  return {
    assetType: "other",
    ticker: null,
    broker: null,
    currentPriceEur: 0,
    currency: "EUR",
    openedAt: null,
    notes: null,
  };
}

export function InvestmentDialog({
  open,
  onOpenChange,
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | undefined;
  initialValues?: DefaultValues<InvestmentFormValues> | undefined;
}) {
  const create = useCreateInvestment();
  const update = useUpdateInvestment();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentInputSchema),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Modifier la position" : "Nouvelle position"}</DialogTitle>
          <DialogDescription>ETF, action, SCPI, livret, crypto ou autre — saisis en EUR.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="grid gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" placeholder="Ex. MSCI World, Bitcoin, SCPI Corum…" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="assetType">Type</Label>
              <Controller
                control={control}
                name="assetType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="assetType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.map((opt) => (
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
              <Label htmlFor="ticker">Ticker (optionnel)</Label>
              <Input
                id="ticker"
                placeholder="Ex. CW8"
                {...register("ticker", { setValueAs: (v: string) => (v === "" ? null : v) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Courtier (optionnel)</Label>
            <Input
              id="broker"
              placeholder="Ex. Trade Republic, Boursorama…"
              {...register("broker", { setValueAs: (v: string) => (v === "" ? null : v) })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="0"
                {...register("quantity", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyPriceEur">Prix d&apos;achat (EUR)</Label>
              <Input
                id="buyPriceEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0,00"
                {...register("buyPriceEur", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPriceEur">Prix actuel (EUR)</Label>
              <Input
                id="currentPriceEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0,00"
                {...register("currentPriceEur", { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          {errors.buyPriceEur && <p className="text-sm text-destructive">{errors.buyPriceEur.message}</p>}
          {errors.currentPriceEur && <p className="text-sm text-destructive">{errors.currentPriceEur.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Devise de l&apos;actif</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => <CurrencyCombobox id="currency" value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openedAt">Date d&apos;ouverture (optionnel)</Label>
              <Input
                id="openedAt"
                type="date"
                {...register("openedAt", { setValueAs: (v: string) => (v === "" ? null : v) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Input
              id="notes"
              placeholder="Ex. versement mensuel automatique…"
              {...register("notes", { setValueAs: (v: string) => (v === "" ? null : v) })}
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
