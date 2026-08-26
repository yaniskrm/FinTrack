"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountInputSchema } from "@fintrack/core";
import type { AccountFormValues } from "@fintrack/core";
import { useCreateAccount, useUpdateAccount } from "../../hooks/use-accounts";
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

const TYPE_OPTIONS = [
  { value: "checking", label: "Compte courant" },
  { value: "savings", label: "Épargne" },
  { value: "investment", label: "Investissement" },
  { value: "cash", label: "Espèces" },
  { value: "other", label: "Autre" },
] as const;

const DEFAULT_COLOR = "#C9A961";

function emptyDefaults(): DefaultValues<AccountFormValues> {
  return { name: "", type: "checking", currency: "EUR", initialBalance: 0, icon: "🏦", color: DEFAULT_COLOR };
}

export function AccountDialog({
  open,
  onOpenChange,
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | undefined;
  initialValues?: DefaultValues<AccountFormValues> | undefined;
}) {
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountInputSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) {
      reset(initialValues ?? emptyDefaults());
    }
  }, [open, initialValues, reset]);

  const icon = watch("icon");
  const color = watch("color");

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
          <DialogTitle>{editId ? "Modifier le compte" : "Nouveau compte"}</DialogTitle>
          <DialogDescription>
            Un compte bancaire, une carte, une épargne — pour répartir vos transactions.
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
            <Input id="name" placeholder="Ex. Compte courant, Livret A…" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="initialBalance">Solde initial</Label>
            <Input
              id="initialBalance"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              {...register("initialBalance", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Peut être négatif (ex. le découvert de départ d&apos;une carte de crédit).
            </p>
            {errors.initialBalance && (
              <p className="text-sm text-destructive">{errors.initialBalance.message}</p>
            )}
          </div>

          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="icon">Icône</Label>
              <Input id="icon" className="text-center text-lg" {...register("icon")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Couleur</Label>
              <div className="flex items-center gap-2">
                <input
                  id="color"
                  type="color"
                  className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
                  {...register("color")}
                />
                <Input aria-label="Couleur (hexadécimal)" value={color} readOnly className="font-mono" />
              </div>
            </div>
          </div>
          {(errors.icon ?? errors.color) && (
            <p className="text-sm text-destructive">{errors.icon?.message ?? errors.color?.message}</p>
          )}

          <div
            className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground"
            aria-hidden
          >
            Aperçu :
            <span
              className="flex size-7 items-center justify-center rounded-full text-sm"
              style={{ backgroundColor: `${color}22` }}
            >
              {icon}
            </span>
            <span className="font-medium text-foreground">{watch("name") || "Nom du compte"}</span>
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
