"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AccountFormValues } from "@fintrack/core";
import { fetchAccounts } from "../lib/accounts/queries";
import { createAccountAction, setAccountActiveAction, updateAccountAction } from "../lib/accounts/actions";
import type { AccountRow } from "../lib/accounts/types";

export const ACCOUNTS_KEY = ["accounts"] as const;

export function useAccounts(initialData: AccountRow[]) {
  return useQuery({ queryKey: ACCOUNTS_KEY, queryFn: fetchAccounts, initialData });
}

export function useCreateAccount() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const result = await createAccountAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.account;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de la création.");
    },
    onSuccess: () => {
      toast.success("Compte créé.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AccountFormValues }) => {
      const result = await updateAccountAction(id, values);
      if (!result.ok) throw new Error(result.error);
      return result.account;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de la modification.");
    },
    onSuccess: () => {
      toast.success("Compte modifié.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

export function useSetAccountActive() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const result = await setAccountActiveAction(id, isActive);
      if (!result.ok) throw new Error(result.error);
      return result.account;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de la mise à jour.");
    },
    onSuccess: (account) => {
      toast.success(account.is_active ? "Compte réactivé." : "Compte archivé.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}
