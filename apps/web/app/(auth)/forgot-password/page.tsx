import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — FinTrack",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Mot de passe oublié
      </h1>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
