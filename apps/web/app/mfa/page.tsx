import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { signOutAction } from "../../lib/auth/actions";
import { MfaChallengeForm } from "./MfaChallengeForm";

export const metadata: Metadata = {
  title: "Vérification — FinTrack",
};

export default async function MfaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Only users who signed in with a password (AAL1) but have a verified factor
  // (next level AAL2) belong here; everyone else is already at the right level.
  if (!(aal?.currentLevel === "aal1" && aal.nextLevel === "aal2")) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <p className="text-center text-2xl font-bold tracking-tight text-indigo-600">FinTrack</p>

        <div className="space-y-2 text-center">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Vérification en deux étapes
          </h1>
          <p className="text-sm text-neutral-500">
            Saisissez le code à 6 chiffres de votre application d&apos;authentification.
          </p>
        </div>

        <MfaChallengeForm />

        <form action={signOutAction} className="text-center">
          <button type="submit" className="text-sm text-neutral-500 hover:underline">
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
