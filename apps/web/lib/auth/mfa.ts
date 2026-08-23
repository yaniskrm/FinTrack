"use server";

import { redirect } from "next/navigation";
import { validateTotpCode } from "@fintrack/core";
import { createClient } from "../supabase/server";

export interface EnrollResult {
  factorId: string;
  qrCode: string;
  secret: string;
}

export interface MfaStatus {
  enrolled: boolean;
  factorId: string | null;
}

/**
 * Returns whether the current user has a verified TOTP factor.
 * Safe to call from Server Components (read-only).
 */
export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    return { enrolled: false, factorId: null };
  }

  // `data.totp` only ever contains verified factors (per Supabase types).
  const verified = data.totp[0];
  return { enrolled: verified !== undefined, factorId: verified?.id ?? null };
}

/**
 * Starts TOTP enrollment: returns a QR code (SVG data URI) + secret for the
 * authenticator app. Cleans up any stale unverified factors first so repeated
 * enrollment attempts don't accumulate or collide on friendlyName.
 */
export async function enrollTotpAction(): Promise<EnrollResult | { error: string }> {
  const supabase = await createClient();

  const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
  if (!listError) {
    if (existing.totp.length > 0) {
      return { error: "La double authentification est déjà activée." };
    }
    // `all` still includes unverified factors — clean up leftovers from
    // abandoned enrollment attempts before starting a fresh one.
    for (const factor of existing.all) {
      if (factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

  if (error) {
    return { error: "Impossible de démarrer l'activation. Réessayez." };
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Confirms enrollment by verifying the first TOTP code. On success the session
 * is upgraded to AAL2 and the factor becomes active.
 */
export async function verifyEnrollmentAction(input: {
  factorId: string;
  code: string;
}): Promise<{ error: string } | undefined> {
  if (!validateTotpCode({ code: input.code }).valid) {
    return { error: "Le code doit contenir 6 chiffres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: input.factorId,
    code: input.code,
  });

  if (error) {
    return { error: "Code incorrect. Vérifiez l'heure de votre appareil et réessayez." };
  }

  redirect("/settings/security");
}

/**
 * Login step-up: verifies a TOTP code against the user's verified factor to
 * raise the session from AAL1 to AAL2.
 */
export async function verifyChallengeAction(input: {
  code: string;
}): Promise<{ error: string } | undefined> {
  if (!validateTotpCode({ code: input.code }).valid) {
    return { error: "Le code doit contenir 6 chiffres." };
  }

  const supabase = await createClient();
  const { data, error: listError } = await supabase.auth.mfa.listFactors();

  if (listError) {
    return { error: "Impossible de vérifier le facteur 2FA. Réessayez." };
  }

  const factor = data.totp[0];
  if (!factor) {
    return { error: "Aucun facteur 2FA actif sur ce compte." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: input.code,
  });

  if (error) {
    return { error: "Code incorrect. Réessayez." };
  }

  redirect("/dashboard");
}

/**
 * Disables TOTP 2FA by unenrolling the factor. Requires an AAL2 session
 * (enforced by middleware on /settings), so a stolen AAL1 session cannot
 * strip a victim's 2FA.
 */
export async function disableTotpAction(input: {
  factorId: string;
}): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId: input.factorId });

  if (error) {
    return { error: "Impossible de désactiver la double authentification." };
  }

  redirect("/settings/security");
}
