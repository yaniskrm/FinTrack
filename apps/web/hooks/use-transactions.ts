"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TransactionFormValues } from "@fintrack/core";
import { fetchCategories, fetchTransactions } from "../lib/transactions/queries";
import {
  createTransactionAction,
  deleteTransactionAction,
  settleReimbursementAction,
  updateTransactionAction,
} from "../lib/transactions/actions";
import type { CategoryRow, TransactionRow } from "../lib/transactions/types";

const TRANSACTIONS_KEY = ["transactions"] as const;
const CATEGORIES_KEY = ["categories"] as const;

export function useTransactions(initialData: TransactionRow[]) {
  return useQuery({ queryKey: TRANSACTIONS_KEY, queryFn: fetchTransactions, initialData });
}

export function useCategories(initialData: CategoryRow[]) {
  return useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories, initialData });
}

function optimisticRow(values: TransactionFormValues): TransactionRow {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    workspace_id: "",
    category_id: values.categoryId,
    amount: values.amount,
    currency: values.currency,
    // Estimate for instant feedback; the real frozen value replaces it on refetch.
    amount_eur: values.amount,
    type: values.type,
    label: values.label,
    merchant: values.merchant,
    note: values.note,
    date: values.date,
    rate_approximate: false,
    recurring_rule_id: null,
    reimbursement_status: values.markAsReimbursable ? "pending" : "none",
    reimbursement_contact: values.markAsReimbursable ? values.reimbursementContact : null,
    settled_transaction_id: null,
    created_at: now,
    updated_at: now,
  };
}

function sortByDateDesc(rows: TransactionRow[]): TransactionRow[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const result = await createTransactionAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.transaction;
    },
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: TRANSACTIONS_KEY });
      const previous = qc.getQueryData<TransactionRow[]>(TRANSACTIONS_KEY) ?? [];
      const optimistic = optimisticRow(values);
      qc.setQueryData<TransactionRow[]>(TRANSACTIONS_KEY, sortByDateDesc([optimistic, ...previous]));
      return { previous, optimisticId: optimistic.id };
    },
    onError: (_error, _values, context) => {
      if (context) qc.setQueryData(TRANSACTIONS_KEY, context.previous);
      toast.error("Échec de l'ajout. Modification annulée.");
    },
    onSuccess: (transaction, _values, context) => {
      // Swap the optimistic row for the server row so the frozen amount_eur
      // (the real conversion) replaces the client-side estimate immediately,
      // without waiting on the background refetch.
      qc.setQueryData<TransactionRow[]>(TRANSACTIONS_KEY, (rows) =>
        sortByDateDesc((rows ?? []).map((row) => (row.id === context.optimisticId ? transaction : row))),
      );
      toast.success("Transaction ajoutée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TransactionFormValues }) => {
      const result = await updateTransactionAction(id, values);
      if (!result.ok) throw new Error(result.error);
      return result.transaction;
    },
    onMutate: async ({ id, values }) => {
      await qc.cancelQueries({ queryKey: TRANSACTIONS_KEY });
      const previous = qc.getQueryData<TransactionRow[]>(TRANSACTIONS_KEY) ?? [];
      const next = previous.map((row) =>
        row.id === id
          ? {
              ...row,
              category_id: values.categoryId,
              amount: values.amount,
              currency: values.currency,
              amount_eur: values.amount,
              type: values.type,
              label: values.label,
              merchant: values.merchant,
              note: values.note,
              date: values.date,
              ...(row.reimbursement_status === "settled"
                ? {}
                : {
                    reimbursement_status: values.markAsReimbursable ? ("pending" as const) : ("none" as const),
                    reimbursement_contact: values.markAsReimbursable ? values.reimbursementContact : null,
                  }),
            }
          : row,
      );
      qc.setQueryData<TransactionRow[]>(TRANSACTIONS_KEY, sortByDateDesc(next));
      return { previous };
    },
    onError: (_error, _values, context) => {
      if (context) qc.setQueryData(TRANSACTIONS_KEY, context.previous);
      toast.error("Échec de la modification. Modification annulée.");
    },
    onSuccess: (transaction) => {
      // Replace the optimistic edit with the server row (correct amount_eur).
      qc.setQueryData<TransactionRow[]>(TRANSACTIONS_KEY, (rows) =>
        sortByDateDesc((rows ?? []).map((row) => (row.id === transaction.id ? transaction : row))),
      );
      toast.success("Transaction modifiée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTransactionAction(id);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TRANSACTIONS_KEY });
      const previous = qc.getQueryData<TransactionRow[]>(TRANSACTIONS_KEY) ?? [];
      qc.setQueryData<TransactionRow[]>(
        TRANSACTIONS_KEY,
        previous.filter((row) => row.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context) qc.setQueryData(TRANSACTIONS_KEY, context.previous);
      toast.error("Échec de la suppression. Modification annulée.");
    },
    onSuccess: () => {
      toast.success("Transaction supprimée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
  });
}

/** Marks a pending reimbursement settled — creates the matching income transaction server-side. */
export function useSettleReimbursement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await settleReimbursementAction(id);
      if (!result.ok) throw new Error(result.error);
      return result.transaction;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec du marquage comme remboursé.");
    },
    onSuccess: () => {
      toast.success("Marqué comme remboursé.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
  });
}
