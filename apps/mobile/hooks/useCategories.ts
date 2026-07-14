import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useWorkspaceId } from "./useTransactions";
import type { Database } from "@fintrack/api-client";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export function useCategories() {
  const { data: workspaceId } = useWorkspaceId();

  return useQuery({
    queryKey: ["categories", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("name");
      if (error) throw error;
      return data as CategoryRow[];
    },
    enabled: !!workspaceId,
    staleTime: Infinity, // categories rarely change
  });
}
