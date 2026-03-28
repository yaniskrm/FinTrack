import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@fintrack/api-client";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"] & { id: string };

// Shared query key prefix — mutations invalidate all transaction queries
const TX_KEY = "transactions-workspace";

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransactionInsert) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert(input)
        .select("*, categories(name, icon, color)")
        .single();
      if (error) throw error;
      return data;
    },

    onMutate: async (newTx) => {
      await queryClient.cancelQueries({ queryKey: [TX_KEY] });
      const snapshot = queryClient.getQueriesData({ queryKey: [TX_KEY] });

      // Optimistically prepend to every cached transaction list
      queryClient.setQueriesData({ queryKey: [TX_KEY] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        const optimistic = {
          ...newTx,
          id: `optimistic-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          categories: null,
        };
        return [optimistic, ...old];
      });

      return { snapshot };
    },

    onError: (_err, _newTx, context) => {
      if (context?.snapshot) {
        for (const [queryKey, data] of context.snapshot) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: TransactionUpdate) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, categories(name, icon, color)")
        .single();
      if (error) throw error;
      return data;
    },

    onMutate: async ({ id, ...update }) => {
      await queryClient.cancelQueries({ queryKey: [TX_KEY] });
      const snapshot = queryClient.getQueriesData({ queryKey: [TX_KEY] });

      queryClient.setQueriesData({ queryKey: [TX_KEY] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((tx: { id: string }) =>
          tx.id === id ? { ...tx, ...update } : tx,
        );
      });

      return { snapshot };
    },

    onError: (_err, _update, context) => {
      if (context?.snapshot) {
        for (const [queryKey, data] of context.snapshot) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [TX_KEY] });
      const snapshot = queryClient.getQueriesData({ queryKey: [TX_KEY] });

      queryClient.setQueriesData({ queryKey: [TX_KEY] }, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.filter((tx: { id: string }) => tx.id !== id);
      });

      return { snapshot };
    },

    onError: (_err, _id, context) => {
      if (context?.snapshot) {
        for (const [queryKey, data] of context.snapshot) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TX_KEY] });
    },
  });
}
