"use client";

import { useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import type { CategoryFormValues } from "@fintrack/core";
import { useCategories } from "../../hooks/use-transactions";
import { useSetCategoryHidden } from "../../hooks/use-categories";
import type { CategoryRow } from "../../lib/transactions/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CategoryDialog } from "./category-dialog";

interface DialogState {
  open: boolean;
  editId?: string;
  initialValues?: DefaultValues<CategoryFormValues>;
}

function toFormValues(category: CategoryRow): DefaultValues<CategoryFormValues> {
  return { name: category.name, icon: category.icon, color: category.color };
}

export function CategoryView({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const { data: categories } = useCategories(initialCategories);
  const setHidden = useSetCategoryHidden();

  const [dialog, setDialog] = useState<DialogState>({ open: false });

  const visible = categories.filter((c) => !c.hidden);
  const hidden = categories.filter((c) => c.hidden);

  function row(category: CategoryRow) {
    return (
      <div key={category.id} className="flex items-center gap-3 px-4 py-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
          style={{ backgroundColor: `${category.color}22` }}
          aria-hidden
        >
          {category.icon}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Modifier"
            onClick={() => {
              setDialog({ open: true, editId: category.id, initialValues: toFormValues(category) });
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={category.hidden ? "Afficher" : "Masquer"}
            disabled={setHidden.isPending}
            onClick={() => {
              setHidden.mutate({ id: category.id, hidden: !category.hidden });
            }}
          >
            {category.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catégories</h1>
          <p className="text-sm text-muted-foreground">
            Personnalisez le nom, l&apos;icône et la couleur de vos catégories, ou masquez celles que vous
            n&apos;utilisez pas.
          </p>
        </div>
        <Button
          onClick={() => {
            setDialog({ open: true });
          }}
        >
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      <Card className="gap-0 divide-y py-0">{visible.map(row)}</Card>

      {hidden.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Masquées</p>
          <Card className="gap-0 divide-y py-0 opacity-60">{hidden.map(row)}</Card>
        </div>
      )}

      <CategoryDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((prev) => ({ ...prev, open }));
        }}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />
    </>
  );
}
