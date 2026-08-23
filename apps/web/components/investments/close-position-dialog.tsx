"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { closeInvestmentSchema } from "@fintrack/core";
import type { CloseInvestmentFormValues } from "@fintrack/core";
import { useCloseInvestment } from "../../hooks/use-investments";
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

export function ClosePositionDialog({
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
  const closeInvestment = useCloseInvestment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CloseInvestmentFormValues>({
    resolver: zodResolver(closeInvestmentSchema),
    defaultValues: { investmentId, salePriceEur: currentPriceEur, closedAt: today() },
  });

  useEffect(() => {
    if (open) {
      reset({ investmentId, salePriceEur: currentPriceEur, closedAt: today() });
    }
  }, [open, investmentId, currentPriceEur, reset]);

  const onSubmit = handleSubmit((values) => {
    closeInvestment.mutate(values, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clôturer la position</DialogTitle>
          <DialogDescription>
            {investmentName} — enregistre la vente et fige la plus/moins-value réalisée. Cette position sortira du
            portefeuille ouvert.
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
              <Label htmlFor="salePriceEur">Prix de vente (EUR)</Label>
              <Input
                id="salePriceEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                autoFocus
                {...register("salePriceEur", { valueAsNumber: true })}
              />
              {errors.salePriceEur && <p className="text-sm text-destructive">{errors.salePriceEur.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="closedAt">Date de vente</Label>
              <Input id="closedAt" type="date" {...register("closedAt")} />
              {errors.closedAt && <p className="text-sm text-destructive">{errors.closedAt.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={closeInvestment.isPending}>
              {closeInvestment.isPending ? "Enregistrement…" : "Clôturer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
