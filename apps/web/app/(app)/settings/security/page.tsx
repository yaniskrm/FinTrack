import type { Metadata } from "next";
import Link from "next/link";
import { getMfaStatus } from "../../../../lib/auth/mfa";
import { EnrollTotp } from "./EnrollTotp";
import { DisableTotp } from "./DisableTotp";

export const metadata: Metadata = {
  title: "Sécurité — FinTrack",
};

export default async function SecuritySettingsPage() {
  const { enrolled, factorId } = await getMfaStatus();

  return (
    <main className="mx-auto max-w-lg space-y-8 px-6 py-12">
      <div className="space-y-1">
        <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
          ← Retour
        </Link>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Sécurité</h1>
      </div>

      <section className="space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Double authentification (2FA)
          </h2>
          <p className="text-sm text-neutral-500">
            Ajoutez un code à usage unique généré par une application (Google Authenticator, Authy,
            1Password…) en plus de votre mot de passe.
          </p>
        </div>

        {enrolled && factorId ? (
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <span aria-hidden>●</span> Activée
            </p>
            <DisableTotp factorId={factorId} />
          </div>
        ) : (
          <EnrollTotp />
        )}
      </section>
    </main>
  );
}
