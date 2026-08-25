"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categoryInputSchema } from "@fintrack/core";
import type { CategoryFormValues } from "@fintrack/core";
import { useCreateCategory, useUpdateCategory } from "../../hooks/use-categories";
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

const DEFAULT_COLOR = "#C9A961";

function emptyDefaults(): DefaultValues<CategoryFormValues> {
  return { name: "", icon: "🏷️", color: DEFAULT_COLOR };
}

export function CategoryDialog({
  open,
  onOpenChange,
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | undefined;
  initialValues?: DefaultValues<CategoryFormValues> | undefined;
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryInputSchema),
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
          <DialogTitle>{editId ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          <DialogDescription>Personnalisez le nom, l&apos;icône et la couleur.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void onSubmit(e);
          }}
          className="grid gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" placeholder="Ex. Loisirs" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
            <span className="font-medium text-foreground">{watch("name") || "Nom de la catégorie"}</span>
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
