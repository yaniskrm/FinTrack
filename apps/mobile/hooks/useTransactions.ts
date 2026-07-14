import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth.store";
import type { Database } from "@fintrack/api-client";

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: { name: string; icon: string; color: string } | null;
};

export interface TransactionFilters {
  search?: string;
  categoryId?: string;
  type?: "expense" | "income" | "transfer";
  from?: string; // ISO date
  to?: string;   // ISO date
}

export function transactionsQueryKey(workspaceId: string, filters?: TransactionFilters) {
  return ["transactions", workspaceId, filters ?? {}] as const;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["transactions-workspace", user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Resolve workspace for current user
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .not("accepted_at", "is", null)
        .limit(1)
        .single();

      if (!membership) throw new Error("No workspace found");

      let query = supabase
        .from("transactions")
        .select("*, categories(name, icon, color)")
        .eq("workspace_id", membership.workspace_id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.search?.trim()) {
        query = query.ilike("label", `%${filters.search.trim()}%`);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.type) {
        query = query.eq("type", filters.type);
      }
      if (filters.from) {
        query = query.gte("date", filters.from);
      }
      if (filters.to) {
        query = query.lte("date", filters.to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TransactionRow[];
    },
    enabled: !!user,
  });
}

/** Returns the active workspace_id for the current user. */
export function useWorkspaceId() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["workspace-id", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .not("accepted_at", "is", null)
        .limit(1)
        .single();
      if (error) throw error;
      return data.workspace_id;
    },
    enabled: !!user,
    staleTime: Infinity, // workspace never changes in v1
  });
}
