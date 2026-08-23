"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BudgetFormValues } from "@fintrack/core";
import { fetchBudgets } from "../lib/budgets/queries";
import { createBudgetAction, deleteBudgetAction, updateBudgetAction } from "../lib/budgets/actions";
import type { BudgetRow } from "../lib/budgets/types";

const BUDGETS_KEY = ["budgets"] as const;

export function useBudgets(initialData: BudgetRow[]) {
  return useQuery({ queryKey: BUDGETS_KEY, queryFn: fetchBudgets, initialData });
}

function optimisticBudget(values: BudgetFormValues): BudgetRow {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    workspace_id: "",
    category_id: values.categoryId,
    amount_eur: values.amountEur,
    period: values.period,
    created_at: new Date().toISOString(),
  };
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: BudgetFormValues) => {
      const result = await createBudgetAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.budget;
    },
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: BUDGETS_KEY });
      const previous = qc.getQueryData<BudgetRow[]>(BUDGETS_KEY) ?? [];
      const optimistic = optimisticBudget(values);
      qc.setQueryData<BudgetRow[]>(BUDGETS_KEY, [...previous, optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (error, _v, context) => {
      if (context) qc.setQueryData(BUDGETS_KEY, context.previous);
      toast.error(error instanceof Error ? error.message : "Échec de l'ajout. Modification annulée.");
    },
    onSuccess: (budget, _v, context) => {
      qc.setQueryData<BudgetRow[]>(BUDGETS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === context.optimisticId ? budget : r)),
      );
      toast.success("Budget ajouté.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: BUDGETS_KEY });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: BudgetFormValues }) => {
      const result = await updateBudgetAction(id, values);
      if (!result.ok) throw new Error(result.error);
      return result.budget;
    },
    onMutate: async ({ id, values }) => {
      await qc.cancelQueries({ queryKey: BUDGETS_KEY });
      const previous = qc.getQueryData<BudgetRow[]>(BUDGETS_KEY) ?? [];
      qc.setQueryData<BudgetRow[]>(
        BUDGETS_KEY,
        previous.map((r) =>
          r.id === id
            ? { ...r, category_id: values.categoryId, amount_eur: values.amountEur, period: values.period }
            : r,
        ),
      );
      return { previous };
    },
    onError: (error, _v, context) => {
      if (context) qc.setQueryData(BUDGETS_KEY, context.previous);
      toast.error(error instanceof Error ? error.message : "Échec de la modification. Modification annulée.");
    },
    onSuccess: (budget) => {
      qc.setQueryData<BudgetRow[]>(BUDGETS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === budget.id ? budget : r)),
      );
      toast.success("Budget modifié.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: BUDGETS_KEY });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteBudgetAction(id);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: BUDGETS_KEY });
      const previous = qc.getQueryData<BudgetRow[]>(BUDGETS_KEY) ?? [];
      qc.setQueryData<BudgetRow[]>(
        BUDGETS_KEY,
        previous.filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_e, _id, context) => {
      if (context) qc.setQueryData(BUDGETS_KEY, context.previous);
      toast.error("Échec de la suppression. Modification annulée.");
    },
    onSuccess: () => {
      toast.success("Budget supprimé.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: BUDGETS_KEY });
    },
  });
}
