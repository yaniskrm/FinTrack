import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { signOutAction } from "../../lib/auth/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-primary">FinTrack</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Vérification en deux étapes</CardTitle>
            <CardDescription>
              Saisissez le code à 6 chiffres de votre application d&apos;authentification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <MfaChallengeForm />
            <form action={signOutAction} className="text-center">
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Se déconnecter
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
