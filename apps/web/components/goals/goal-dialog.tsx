"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { goalInputSchema } from "@fintrack/core";
import type { GoalFormValues } from "@fintrack/core";
import { useCreateGoal, useUpdateGoal } from "../../hooks/use-goals";
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

function emptyDefaults(): DefaultValues<GoalFormValues> {
  return {
    name: "",
    currentAmountEur: 0,
    deadline: null,
  };
}

export function GoalDialog({
  open,
  onOpenChange,
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | undefined;
  initialValues?: DefaultValues<GoalFormValues> | undefined;
}) {
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalInputSchema),
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
          <DialogTitle>{editId ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
          <DialogDescription>
            Un projet d&apos;épargne avec une cible et, si vous le souhaitez, une échéance.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="grid gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" placeholder="Ex. Voyage au Japon, Apport immobilier…" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="targetAmountEur">Montant cible (EUR)</Label>
              <Input
                id="targetAmountEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0,00"
                {...register("targetAmountEur", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentAmountEur">Montant actuel (EUR)</Label>
              <Input
                id="currentAmountEur"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0,00"
                {...register("currentAmountEur", { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors.targetAmountEur && (
            <p className="text-sm text-destructive">{errors.targetAmountEur.message}</p>
          )}
          {errors.currentAmountEur && (
            <p className="text-sm text-destructive">{errors.currentAmountEur.message}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="deadline">Échéance (optionnel)</Label>
            <Input
              id="deadline"
              type="date"
              {...register("deadline", { setValueAs: (v: string) => (v === "" ? null : v) })}
            />
            {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
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
