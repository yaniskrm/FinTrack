"use server";

import { pushEndpointSchema, pushSubscriptionSchema } from "@fintrack/core";
import type { PushSubscriptionInput } from "@fintrack/core";
import { createClient } from "../supabase/server";

export type PushActionResult = { ok: true } | { ok: false; error: string };

export async function saveSubscriptionAction(input: PushSubscriptionInput): Promise<PushActionResult> {
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Abonnement invalide." };
  }
  const subscription = parsed.data;

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
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    return { ok: false, error: "Enregistrement de l'abonnement impossible." };
  }
  return { ok: true };
}

export async function deleteSubscriptionAction(endpoint: string): Promise<PushActionResult> {
  const parsedEndpoint = pushEndpointSchema.safeParse(endpoint);
  if (!parsedEndpoint.success) {
    return { ok: false, error: "Abonnement invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Session invalide." };
  }

  // Scoped by user_id too (RLS already enforces it — defence in depth).
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsedEndpoint.data)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Désabonnement impossible." };
  }
  return { ok: true };
}
