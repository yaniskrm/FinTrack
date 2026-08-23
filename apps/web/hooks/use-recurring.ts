"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RecurringFormValues } from "@fintrack/core";
import { fetchRecurringRules } from "../lib/recurring/queries";
import {
  createRecurringRuleAction,
  deleteRecurringRuleAction,
  updateRecurringRuleAction,
} from "../lib/recurring/actions";
import type { RecurringRuleRow } from "../lib/recurring/types";

const RECURRING_KEY = ["recurring_rules"] as const;

export function useRecurringRules(initialData: RecurringRuleRow[]) {
  return useQuery({ queryKey: RECURRING_KEY, queryFn: fetchRecurringRules, initialData });
}

function sortByNext(rows: RecurringRuleRow[]): RecurringRuleRow[] {
  return [...rows].sort((a, b) => (a.next_occurrence < b.next_occurrence ? -1 : 1));
}

function optimisticRule(values: RecurringFormValues): RecurringRuleRow {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    workspace_id: "",
    category_id: values.categoryId,
    amount: values.amount,
    currency: values.currency,
    type: values.type,
    label: values.label,
    frequency: values.frequency,
    start_date: values.startDate,
    end_date: values.endDate,
    next_occurrence: values.startDate,
    created_at: new Date().toISOString(),
  };
}

export function useCreateRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: RecurringFormValues) => {
      const result = await createRecurringRuleAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.rule;
    },
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: RECURRING_KEY });
      const previous = qc.getQueryData<RecurringRuleRow[]>(RECURRING_KEY) ?? [];
      const optimistic = optimisticRule(values);
      qc.setQueryData<RecurringRuleRow[]>(RECURRING_KEY, sortByNext([optimistic, ...previous]));
      return { previous, optimisticId: optimistic.id };
    },
    onError: (_e, _v, context) => {
      if (context) qc.setQueryData(RECURRING_KEY, context.previous);
      toast.error("Échec de l'ajout. Modification annulée.");
    },
    onSuccess: (rule, _v, context) => {
      qc.setQueryData<RecurringRuleRow[]>(RECURRING_KEY, (rows) =>
        sortByNext((rows ?? []).map((r) => (r.id === context.optimisticId ? rule : r))),
      );
      toast.success("Abonnement ajouté.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useUpdateRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: RecurringFormValues }) => {
      const result = await updateRecurringRuleAction(id, values);
      if (!result.ok) throw new Error(result.error);
      return result.rule;
    },
    onMutate: async ({ id, values }) => {
      await qc.cancelQueries({ queryKey: RECURRING_KEY });
      const previous = qc.getQueryData<RecurringRuleRow[]>(RECURRING_KEY) ?? [];
      qc.setQueryData<RecurringRuleRow[]>(
        RECURRING_KEY,
        sortByNext(
          previous.map((r) =>
            r.id === id
              ? {
                  ...r,
                  category_id: values.categoryId,
                  amount: values.amount,
                  currency: values.currency,
                  type: values.type,
                  label: values.label,
                  frequency: values.frequency,
                  end_date: values.endDate,
                }
              : r,
          ),
        ),
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context) qc.setQueryData(RECURRING_KEY, context.previous);
      toast.error("Échec de la modification. Modification annulée.");
    },
    onSuccess: (rule) => {
      qc.setQueryData<RecurringRuleRow[]>(RECURRING_KEY, (rows) =>
        sortByNext((rows ?? []).map((r) => (r.id === rule.id ? rule : r))),
      );
      toast.success("Abonnement modifié.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useDeleteRecurringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRecurringRuleAction(id);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: RECURRING_KEY });
      const previous = qc.getQueryData<RecurringRuleRow[]>(RECURRING_KEY) ?? [];
      qc.setQueryData<RecurringRuleRow[]>(
        RECURRING_KEY,
        previous.filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_e, _id, context) => {
      if (context) qc.setQueryData(RECURRING_KEY, context.previous);
      toast.error("Échec de la suppression. Modification annulée.");
    },
    onSuccess: () => {
      toast.success("Abonnement supprimé.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}
