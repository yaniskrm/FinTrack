"use server";

import type { Currency } from "@fintrack/core";
import { createClient } from "../supabase/server";

export type ProfileMutationResult = { ok: true } | { ok: false; error: string };

/**
 * Sets the workspace's default currency ("mode pays") — pre-fills the
 * transaction form's currency field so a traveler doesn't have to pick it
 * every time. Existing transactions and their frozen amount_eur are
 * untouched (ADR-005): this only changes the default for future entries.
 */
export async function updateDefaultCurrencyAction(currency: Currency): Promise<ProfileMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Non authentifié." };
  }

  const { error } = await supabase.from("profiles").update({ default_currency: currency }).eq("id", user.id);

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true };
}
