"use client";

import { useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { Flag, Pencil, Plus, Trash2 } from "lucide-react";
import { calculateGoalProgress, formatCurrency } from "@fintrack/core";
import type { GoalFormValues, GoalStatus } from "@fintrack/core";
import { useDeleteGoal, useGoals } from "../../hooks/use-goals";
import type { GoalRow } from "../../lib/goals/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { GoalDialog } from "./goal-dialog";

const STATUS_META: Record<GoalStatus, { label: string; color: string }> = {
  achieved: { label: "Atteint", color: "var(--success)" },
  on_track: { label: "En bonne voie", color: "var(--chart-1)" },
  overdue: { label: "Échéance dépassée", color: "var(--destructive)" },
  no_deadline: { label: "Sans échéance", color: "var(--muted-foreground)" },
};

interface DialogState {
  open: boolean;
  editId?: string;
  initialValues?: DefaultValues<GoalFormValues>;
}

function toFormValues(goal: GoalRow): DefaultValues<GoalFormValues> {
  return {
    name: goal.name,
    targetAmountEur: goal.target_amount_eur,
    currentAmountEur: goal.current_amount_eur,
    deadline: goal.deadline,
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function GoalView({ initialGoals }: { initialGoals: GoalRow[] }) {
  const { data: goals } = useGoals(initialGoals);
  const deleteGoal = useDeleteGoal();

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Objectifs</h1>
          <p className="text-sm text-muted-foreground">Projets d&apos;épargne avec cible et échéance.</p>
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

      {goals.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Aucun objectif pour le moment.</p>
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
          {goals.map((goal) => {
            const progress = calculateGoalProgress(goal);
            const status = STATUS_META[progress.status];
            return (
              <div key={goal.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-base"
                  aria-hidden
                >
                  <Flag className="size-4 text-muted-foreground" />
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{goal.name}</p>
                    <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(goal.current_amount_eur, "EUR")} /{" "}
                      {formatCurrency(goal.target_amount_eur, "EUR")}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${String(progress.percentage)}%`, backgroundColor: status.color }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.label}
                    </span>
                    {goal.deadline && <span>· {formatDate(goal.deadline)}</span>}
                    {progress.status === "on_track" && progress.requiredMonthlyContribution !== null && (
                      <span>
                        · {formatCurrency(progress.requiredMonthlyContribution, "EUR")}/mois nécessaires
                      </span>
                    )}
                    {progress.status === "overdue" && (
                      <span className="font-medium" style={{ color: "var(--destructive)" }}>
                        · contribution insuffisante
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {confirmingDeleteId === goal.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteGoal.isPending}
                        onClick={() => {
                          deleteGoal.mutate(goal.id);
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
                          setDialog({ open: true, editId: goal.id, initialValues: toFormValues(goal) });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => {
                          setConfirmingDeleteId(goal.id);
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

      <GoalDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((prev) => ({ ...prev, open }));
        }}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />
    </div>
  );
}
