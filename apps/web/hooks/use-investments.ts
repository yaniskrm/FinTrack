"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CloseInvestmentFormValues, InvestmentFormValues, InvestmentValuationFormValues } from "@fintrack/core";
import { fetchInvestments, fetchInvestmentValuations } from "../lib/investments/queries";
import {
  addInvestmentValuationAction,
  closeInvestmentAction,
  createInvestmentAction,
  deleteInvestmentAction,
  updateInvestmentAction,
} from "../lib/investments/actions";
import type { InvestmentRow, InvestmentValuationRow } from "../lib/investments/types";

const INVESTMENTS_KEY = ["investments"] as const;
const VALUATIONS_KEY = ["investment-valuations"] as const;

export function useInvestments(initialData: InvestmentRow[]) {
  return useQuery({ queryKey: INVESTMENTS_KEY, queryFn: fetchInvestments, initialData });
}

export function useInvestmentValuations(initialData: InvestmentValuationRow[]) {
  return useQuery({ queryKey: VALUATIONS_KEY, queryFn: fetchInvestmentValuations, initialData });
}

function optimisticInvestment(values: InvestmentFormValues): InvestmentRow {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    workspace_id: "",
    name: values.name,
    asset_type: values.assetType,
    ticker: values.ticker,
    broker: values.broker,
    quantity: values.quantity,
    buy_price_eur: values.buyPriceEur,
    current_price_eur: values.currentPriceEur,
    currency: values.currency,
    opened_at: values.openedAt,
    notes: values.notes,
    closed_at: null,
    sale_price_eur: null,
    created_at: new Date().toISOString(),
  };
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: InvestmentFormValues) => {
      const result = await createInvestmentAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.investment;
    },
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: INVESTMENTS_KEY });
      const previous = qc.getQueryData<InvestmentRow[]>(INVESTMENTS_KEY) ?? [];
      const optimistic = optimisticInvestment(values);
      qc.setQueryData<InvestmentRow[]>(INVESTMENTS_KEY, [...previous, optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (error, _v, context) => {
      if (context) qc.setQueryData(INVESTMENTS_KEY, context.previous);
      toast.error(error instanceof Error ? error.message : "Échec de l'ajout. Modification annulée.");
    },
    onSuccess: (investment, _v, context) => {
      qc.setQueryData<InvestmentRow[]>(INVESTMENTS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === context.optimisticId ? investment : r)),
      );
      toast.success("Position ajoutée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
    },
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: InvestmentFormValues }) => {
      const result = await updateInvestmentAction(id, values);
      if (!result.ok) throw new Error(result.error);
      return result.investment;
    },
    onMutate: async ({ id, values }) => {
      await qc.cancelQueries({ queryKey: INVESTMENTS_KEY });
      const previous = qc.getQueryData<InvestmentRow[]>(INVESTMENTS_KEY) ?? [];
      qc.setQueryData<InvestmentRow[]>(
        INVESTMENTS_KEY,
        previous.map((r) =>
          r.id === id
            ? {
                ...r,
                name: values.name,
                asset_type: values.assetType,
                ticker: values.ticker,
                broker: values.broker,
                quantity: values.quantity,
                buy_price_eur: values.buyPriceEur,
                current_price_eur: values.currentPriceEur,
                currency: values.currency,
                opened_at: values.openedAt,
                notes: values.notes,
              }
            : r,
        ),
      );
      return { previous };
    },
    onError: (error, _v, context) => {
      if (context) qc.setQueryData(INVESTMENTS_KEY, context.previous);
      toast.error(error instanceof Error ? error.message : "Échec de la modification. Modification annulée.");
    },
    onSuccess: (investment) => {
      qc.setQueryData<InvestmentRow[]>(INVESTMENTS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === investment.id ? investment : r)),
      );
      toast.success("Position modifiée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
    },
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteInvestmentAction(id);
      if (!result.ok) throw new Error(result.error);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: INVESTMENTS_KEY });
      const previous = qc.getQueryData<InvestmentRow[]>(INVESTMENTS_KEY) ?? [];
      qc.setQueryData<InvestmentRow[]>(
        INVESTMENTS_KEY,
        previous.filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_e, _id, context) => {
      if (context) qc.setQueryData(INVESTMENTS_KEY, context.previous);
      toast.error("Échec de la suppression. Modification annulée.");
    },
    onSuccess: () => {
      toast.success("Position supprimée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
    },
  });
}

export function useAddInvestmentValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: InvestmentValuationFormValues) => {
      const result = await addInvestmentValuationAction(values);
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de l'ajout de la valorisation.");
    },
    onSuccess: ({ investment }) => {
      qc.setQueryData<InvestmentRow[]>(INVESTMENTS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === investment.id ? investment : r)),
      );
      toast.success("Valorisation ajoutée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
      void qc.invalidateQueries({ queryKey: VALUATIONS_KEY });
    },
  });
}

export function useCloseInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CloseInvestmentFormValues) => {
      const result = await closeInvestmentAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.investment;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de la clôture de la position.");
    },
    onSuccess: (investment) => {
      qc.setQueryData<InvestmentRow[]>(INVESTMENTS_KEY, (rows) =>
        (rows ?? []).map((r) => (r.id === investment.id ? investment : r)),
      );
      toast.success("Position clôturée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: INVESTMENTS_KEY });
    },
  });
}
