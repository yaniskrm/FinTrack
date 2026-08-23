"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { GoalFormValues } from "@fintrack/core";
import { fetchGoals } from "../lib/goals/queries";
import { createGoalAction, deleteGoalAction, updateGoalAction } from "../lib/goals/actions";
import type { GoalRow } from "../lib/goals/types";

const GOALS_KEY = ["goals"] as const;

export function useGoals(initialData: GoalRow[]) {
  return useQuery({ queryKey: GOALS_KEY, queryFn: fetchGoals, initialData });
}

function optimisticGoal(values: GoalFormValues): GoalRow {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    workspace_id: "",
    name: values.name,
    target_amount_eur: values.targetAmountEur,
    current_amount_eur: values.currentAmountEur,
    deadline: values.deadline,
    created_at: new Date().toISOString(),
  };
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const result = await createGoalAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.goal;
    },
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: GOALS_KEY });
      const previous = qc.getQueryData<GoalRow[]>(GOALS_KEY) ?? [];
      const optimistic = optimisticGoal(values);
      qc.setQueryData<GoalRow[]>(GOALS_KEY, [...previous, optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (error, _v, context) => {
      if (context) qc.setQueryData(GOALS_KEY, context.previous);
      toast.error(error instanceof Error ? error.message : "Échec de l'ajout. Modification annulée.");
    },
    onSuccess: (goal, _v, context) => {
      qc.setQueryData<GoalRow[]>(GOALS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === context.optimisticId ? goal : r)),
      );
      toast.success("Objectif ajouté.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: GoalFormValues }) => {
      const result = await updateGoalAction(id, values);
      if (!result.ok) throw new Error(result.error);
      return result.goal;
    },
    onMutate: async ({ id, values }) => {
      await qc.cancelQueries({ queryKey: GOALS_KEY });
      const previous = qc.getQueryData<GoalRow[]>(GOALS_KEY) ?? [];
      qc.setQueryData<GoalRow[]>(
        GOALS_KEY,
        previous.map((r) =>
          r.id === id
            ? {
                ...r,
                name: values.name,
                target_amount_eur: values.targetAmountEur,
                current_amount_eur: values.currentAmountEur,
                deadline: values.deadline,
              }
            : r,
        ),
      );
      return { previous };
    },
    onError: (error, _v, context) => {
      if (context) qc.setQueryData(GOALS_KEY, context.previous);
      toast.error(error instanceof Error ? error.message : "Échec de la modification. Modification annulée.");
    },
    onSuccess: (goal) => {
      qc.setQueryData<GoalRow[]>(GOALS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === goal.id ? goal : r)),
      );
      toast.success("Objectif modifié.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteGoalAction(id);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: GOALS_KEY });
      const previous = qc.getQueryData<GoalRow[]>(GOALS_KEY) ?? [];
      qc.setQueryData<GoalRow[]>(
        GOALS_KEY,
        previous.filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_e, _id, context) => {
      if (context) qc.setQueryData(GOALS_KEY, context.previous);
      toast.error("Échec de la suppression. Modification annulée.");
    },
    onSuccess: () => {
      toast.success("Objectif supprimé.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}
