"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { investmentValuationInputSchema } from "@fintrack/core";
import type { InvestmentValuationFormValues } from "@fintrack/core";
import { useAddInvestmentValuation } from "../../hooks/use-investments";
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ValuationDialog({
  open,
  onOpenChange,
  investmentId,
  investmentName,
  currentPriceEur,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentId: string;
  investmentName: string;
  currentPriceEur: number;
}) {
  const addValuation = useAddInvestmentValuation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvestmentValuationFormValues>({
    resolver: zodResolver(investmentValuationInputSchema),
    defaultValues: { investmentId, priceEur: currentPriceEur, recordedAt: today() },
  });

  useEffect(() => {
    if (open) {
      reset({ investmentId, priceEur: currentPriceEur, recordedAt: today() });
    }
  }, [open, investmentId, currentPriceEur, reset]);

  const onSubmit = handleSubmit((values) => {
    addValuation.mutate(values, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle valorisation</DialogTitle>
          <DialogDescription>
            {investmentName} — met à jour le prix actuel et alimente la courbe de performance.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="grid gap-4"
        >
          <input type="hidden" {...register("investmentId")} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priceEur">Prix (EUR)</Label>
              <Input
                id="priceEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                autoFocus
                {...register("priceEur", { valueAsNumber: true })}
              />
              {errors.priceEur && <p className="text-sm text-destructive">{errors.priceEur.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recordedAt">Date</Label>
              <Input id="recordedAt" type="date" {...register("recordedAt")} />
              {errors.recordedAt && <p className="text-sm text-destructive">{errors.recordedAt.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={addValuation.isPending}>
              {addValuation.isPending ? "Enregistrement…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
