"use server";

import { redirect } from "next/navigation";
import { deleteAccountInputSchema } from "@fintrack/core";
import { deleteSession } from "@fintrack/core/server";
import { getEnableBankingCredentials } from "../banking/credentials";
import { createClient } from "../supabase/server";
import { createStatelessClient } from "../supabase/stateless";
import { CAPTCHA_FAILED_MESSAGE, isCaptchaError, resolveCaptcha } from "./captcha";

export interface DeleteAccountResult {
  error: string;
}

/**
 * Revokes the Open Banking consents at the provider before the rows that
 * reference them disappear. Best-effort by design: the account must be
 * erasable even when the provider is unreachable or not configured (CI,
 * local), and a consent left behind expires on its own `valid_until`.
 */
async function revokeBankSessions(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.from("bank_connections").select("session_id").not("session_id", "is", null);
  // `.not("session_id", "is", null)` above already narrows the column to string.
  const sessionIds = [...new Set((data ?? []).map((row) => row.session_id))];
  if (sessionIds.length === 0) return;

  let credentials: ReturnType<typeof getEnableBankingCredentials>;
  try {
    credentials = getEnableBankingCredentials();
  } catch {
    return; // Enable Banking is not configured in this environment — nothing to revoke.
  }

  await Promise.allSettled(sessionIds.map((id) => deleteSession(id, credentials)));
}

/**
 * Erases the signed-in user's account and all of its data (RGPD art. 17).
 * Irreversible, so: the password is re-verified, the confirmation word is
 * required, and the DB function itself refuses a 2FA user without an aal2 session.
 */
export async function deleteAccountAction(input: {
  password: string;
  confirmation: string;
  captchaToken?: string | undefined;
}): Promise<DeleteAccountResult | undefined> {
  const parsed = deleteAccountInputSchema.safeParse({ password: input.password, confirmation: input.confirmation });
  if (!parsed.success) {
    return { error: "Saisissez votre mot de passe et le mot « SUPPRIMER » pour confirmer." };
  }

  // Verifying the password is a signInWithPassword, which Supabase CAPTCHA protection covers.
  const captcha = resolveCaptcha(input.captchaToken);
  if (!captcha.ok) {
    return { error: captcha.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Session invalide. Reconnectez-vous et réessayez." };
  }

  // Stateless on purpose: it must not replace the real (possibly aal2) session.
  const { error: passwordError } = await createStatelessClient().auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
    options: captcha.options,
  });
  if (passwordError) {
    return { error: isCaptchaError(passwordError) ? CAPTCHA_FAILED_MESSAGE : "Mot de passe incorrect." };
  }

  await revokeBankSessions();

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    if (error.code === "42501") {
      return { error: "Votre double authentification doit être validée : reconnectez-vous avec votre code puis réessayez." };
    }
    if (error.code === "42883" || error.code === "PGRST202") {
      // The migration adding the function has not been applied to this database.
      return { error: "La suppression de compte n'est pas disponible pour le moment. Contactez-nous pour l'effectuer." };
    }
    return { error: "La suppression a échoué et rien n'a été supprimé. Réessayez dans un instant." };
  }

  // The user no longer exists server-side; clear the cookies. Ignore a failure here.
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/login?deleted=1");
}
