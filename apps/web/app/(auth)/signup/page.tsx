import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Créer un compte — FinTrack",
};

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Créer un compte
      </h1>

      <SignUpForm />

      <p className="text-center text-sm text-neutral-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
