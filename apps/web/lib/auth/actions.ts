"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  validateResetPassword,
  validateSignIn,
  validateSignUp,
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

  redirect("/dashboard");
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
