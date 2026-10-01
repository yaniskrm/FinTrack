"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ImportBatchInput } from "@fintrack/core";
import { importTransactionsAction } from "../lib/transactions/import-actions";

const TRANSACTIONS_KEY = ["transactions"] as const;

export function useImportTransactions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (batch: ImportBatchInput) => {
      const result = await importTransactionsAction(batch);
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de l'import.");
    },
    onSuccess: ({ imported, duplicatesSkipped }) => {
      const base = `${String(imported)} transaction${imported > 1 ? "s" : ""} importée${imported > 1 ? "s" : ""}.`;
      toast.success(
        duplicatesSkipped > 0
          ? `${base} ${String(duplicatesSkipped)} déjà importée${duplicatesSkipped > 1 ? "s" : ""} ignorée${duplicatesSkipped > 1 ? "s" : ""}.`
          : base,
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
    },
  });
}
