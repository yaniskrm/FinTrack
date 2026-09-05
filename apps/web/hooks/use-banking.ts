"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACCOUNTS_KEY } from "./use-accounts";
import {
  createAccountFromConnectionAction,
  disconnectBankConnectionAction,
  linkBankConnectionAction,
  listAspspsForCountryAction,
  reconnectBankConnectionAction,
  startBankConnectionAction,
  syncBankConnectionAction,
} from "../lib/banking/actions";
import { fetchBankConnections } from "../lib/banking/queries";
import type { BankConnectionRow } from "../lib/banking/types";

export const BANK_CONNECTIONS_KEY = ["bank-connections"] as const;

function currentOrigin(): string {
  return window.location.origin;
}

export function useBankConnections(initialData: BankConnectionRow[]) {
  return useQuery({ queryKey: BANK_CONNECTIONS_KEY, queryFn: fetchBankConnections, initialData });
}

export function useListAspsps() {
  return useMutation({
    mutationFn: async (country: string) => {
      const result = await listAspspsForCountryAction(country);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec du chargement des banques.");
    },
  });
}

export function useStartBankConnection() {
  return useMutation({
    mutationFn: async ({ aspspName, aspspCountry }: { aspspName: string; aspspCountry: string }) => {
      const result = await startBankConnectionAction(aspspName, aspspCountry, currentOrigin());
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Connexion impossible.");
    },
  });
}

export function useReconnectBankConnection() {
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const result = await reconnectBankConnectionAction(connectionId, currentOrigin());
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Reconnexion impossible.");
    },
  });
}

export function useLinkBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId, accountId }: { connectionId: string; accountId: string }) => {
      const result = await linkBankConnectionAction(connectionId, accountId);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Compte lié.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Liaison impossible.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: BANK_CONNECTIONS_KEY });
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

export function useCreateAccountFromConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId, name }: { connectionId: string; name: string }) => {
      const result = await createAccountFromConnectionAction(connectionId, name);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Compte créé et lié.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Création impossible.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: BANK_CONNECTIONS_KEY });
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

export function useSyncBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const result = await syncBankConnectionAction(connectionId);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (summary) => {
      toast.success(
        summary.imported > 0
          ? `${String(summary.imported)} transaction${summary.imported > 1 ? "s" : ""} importée${summary.imported > 1 ? "s" : ""}.`
          : "Aucune nouvelle transaction.",
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Synchronisation impossible.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: BANK_CONNECTIONS_KEY });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDisconnectBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const result = await disconnectBankConnectionAction(connectionId);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => {
      toast.success("Banque déconnectée.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Déconnexion impossible.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: BANK_CONNECTIONS_KEY });
    },
  });
}
