"use client";

import { useMemo, useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { formatCurrency } from "@fintrack/core";
import type { Currency, RecurringFormValues } from "@fintrack/core";
import { useDeleteRecurringRule, useRecurringRules } from "../../hooks/use-recurring";
import type { RecurringRuleRow } from "../../lib/recurring/types";
import type { CategoryRow } from "../../lib/transactions/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { RecurringDialog } from "./recurring-dialog";

const FREQUENCY_LABELS: Record<RecurringRuleRow["frequency"], string> = {
  daily: "Quotidien",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  yearly: "Annuel",
};

interface DialogState {
  open: boolean;
  editId?: string;
  initialValues?: DefaultValues<RecurringFormValues>;
}

function toFormValues(rule: RecurringRuleRow): DefaultValues<RecurringFormValues> {
  return {
    amount: rule.amount,
    currency: rule.currency as Currency,
    type: rule.type,
    label: rule.label,
    categoryId: rule.category_id,
    frequency: rule.frequency,
    startDate: rule.start_date,
    endDate: rule.end_date,
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RecurringView({
  initialRules,
  initialCategories,
}: {
  initialRules: RecurringRuleRow[];
  initialCategories: CategoryRow[];
}) {
  const { data: rules } = useRecurringRules(initialRules);
  const deleteRule = useDeleteRecurringRule();

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const categoryById = useMemo(
    () => new Map(initialCategories.map((c) => [c.id, c])),
    [initialCategories],
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Abonnements</h1>
          <p className="text-sm text-muted-foreground">
            Récurrences générées automatiquement à chaque échéance.
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

      {rules.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Aucun abonnement pour le moment.</p>
          <Button
            variant="outline"
            onClick={() => {
              setDialog({ open: true });
            }}
          >
            <Plus className="size-4" />
            Créer le premier
          </Button>
        </Card>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {rules.map((rule) => {
            const category = rule.category_id ? categoryById.get(rule.category_id) : undefined;
            const sign = rule.type === "expense" ? "-" : rule.type === "income" ? "+" : "";
            return (
              <div key={rule.id} className="group flex items-center gap-3 px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: `${category?.color ?? "#8883"}22` }}
                  aria-hidden
                >
                  {category?.icon ?? <Repeat className="size-4 text-muted-foreground" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{rule.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {FREQUENCY_LABELS[rule.frequency]} · prochaine échéance {formatDate(rule.next_occurrence)}
                  </p>
                </div>

                <p className="text-sm font-semibold tabular-nums">
                  {sign}
                  {formatCurrency(rule.amount, rule.currency as Currency)}
                </p>

                <div className="flex items-center gap-0.5">
                  {confirmingDeleteId === rule.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteRule.isPending}
                        onClick={() => {
                          deleteRule.mutate(rule.id);
                          setConfirmingDeleteId(null);
                        }}
                      >
                        Supprimer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmingDeleteId(null);
                        }}
                      >
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Modifier"
                        onClick={() => {
                          setDialog({ open: true, editId: rule.id, initialValues: toFormValues(rule) });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => {
                          setConfirmingDeleteId(rule.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <RecurringDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((prev) => ({ ...prev, open }));
        }}
        categories={initialCategories}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />
    </div>
  );
}
