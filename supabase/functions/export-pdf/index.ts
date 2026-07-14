/**
 * Edge Function: export-pdf
 * Generates a PDF report for a workspace's transactions.
 * Called on-demand from the client.
 *
 * Phase 8 will implement this fully.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ExportRequest {
  workspace_id: string;
  from: string; // ISO date
  to: string;   // ISO date
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Verify the request is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const body = (await req.json()) as ExportRequest;

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*, categories(name, icon)")
    .eq("workspace_id", body.workspace_id)
    .gte("date", body.from)
    .lte("date", body.to)
    .order("date", { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // TODO (Phase 8): generate actual PDF using a Deno PDF library
  // For now, return JSON as placeholder
  return new Response(
    JSON.stringify({ transactions, count: transactions?.length ?? 0 }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
