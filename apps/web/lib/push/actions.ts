"use server";

import { createClient } from "../supabase/server";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type PushActionResult = { ok: true } | { ok: false; error: string };

export async function saveSubscriptionAction(input: PushSubscriptionInput): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Session invalide." };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (workspaceError || !workspace) {
    return { ok: false, error: "Espace introuvable." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      workspace_id: workspace.id,
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth_key: input.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    return { ok: false, error: "Enregistrement de l'abonnement impossible." };
  }
  return { ok: true };
}

export async function deleteSubscriptionAction(endpoint: string): Promise<PushActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) {
    return { ok: false, error: "Désabonnement impossible." };
  }
  return { ok: true };
}
