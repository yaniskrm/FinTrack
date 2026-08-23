"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  validateChangePassword,
  validateResetPassword,
  validateSignIn,
  validateSignUp,
  validateUpdateEmail,
  validateUpdatePassword,
} from "@fintrack/core";
import { createClient } from "../supabase/server";
import { resolveSiteOrigin } from "../env";

export interface ActionResult {
  error: string;
}

export interface SignUpResult {
  error?: string;
  emailSent?: boolean;
}

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult | undefined> {
  const { valid } = validateSignIn(input);

  if (!valid) {
    return { error: "Email ou mot de passe invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  // Decide the destination here rather than always redirecting to /dashboard
  // and relying on the middleware to re-redirect a pending step-up to /mfa:
  // that second redirect happens on the *next* request the client router
  // makes, and a server-action-triggered redirect doesn't reliably chain
  // through a middleware redirect on the client side (the URL bar can end up
  // stuck on /dashboard even though the server did serve /mfa's content).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const stepUpPending = aal?.currentLevel === "aal1" && aal.nextLevel === "aal2";

  redirect(stepUpPending ? "/mfa" : "/dashboard");
}

export async function signUpAction(input: {
  email: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
}): Promise<SignUpResult> {
  const { valid } = validateSignUp(input);

  if (!valid) {
    return { error: "Vérifiez votre email, votre mot de passe et l'acceptation de la politique de confidentialité." };
  }

  const origin = resolveSiteOrigin((await headers()).get("origin"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  });

  if (error) {
    return { error: "Inscription impossible. Cette adresse email est peut-être déjà utilisée." };
  }

  return { emailSent: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<ActionResult | { success: true }> {
  const { valid } = validateResetPassword(input);

  if (!valid) {
    return { error: "Adresse email invalide." };
  }

  const origin = resolveSiteOrigin((await headers()).get("origin"));
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success, whether or not the email exists — avoids leaking
  // account existence to an unauthenticated caller.
  return { success: true };
}

export async function updatePasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult | undefined> {
  const { valid } = validateUpdatePassword(input);

  if (!valid) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères et correspondre à la confirmation." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: input.password });

  if (error) {
    return { error: "Impossible de mettre à jour le mot de passe. Réessayez la procédure depuis le début." };
  }

  redirect("/dashboard");
}

export interface UpdateEmailResult {
  error?: string;
  emailSent?: boolean;
}

/**
 * Changes the account email. Supabase (`double_confirm_changes`) requires
 * confirmation from both the old and new address before the change takes
 * effect — this only starts that flow.
 */
export async function updateEmailAction(input: { email: string }): Promise<UpdateEmailResult> {
  const { valid } = validateUpdateEmail(input);

  if (!valid) {
    return { error: "Adresse email invalide." };
  }

  const origin = resolveSiteOrigin((await headers()).get("origin"));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: input.email },
    { emailRedirectTo: `${origin}/auth/callback?next=/settings/account` },
  );

  if (error) {
    return { error: "Impossible de démarrer le changement d'email. Réessayez." };
  }

  return { emailSent: true };
}

/**
 * Changes the account password from within the app. Requires the current
 * password (re-authenticated via signInWithPassword) so a hijacked or
 * left-open session can't silently lock the real owner out — unlike the
 * forgot-password recovery flow, which is reached via a fresh email link.
 */
export async function changePasswordAction(input: {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult | undefined> {
  const { valid } = validateChangePassword(input);

  if (!valid) {
    return { error: "Vérifiez le mot de passe actuel et le nouveau mot de passe (8 caractères minimum)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Session invalide. Reconnectez-vous et réessayez." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });

  if (reauthError) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: input.password });

  if (error) {
    return { error: "Impossible de mettre à jour le mot de passe. Réessayez." };
  }

  return undefined;
}
