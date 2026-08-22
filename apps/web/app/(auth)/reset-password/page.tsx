import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — FinTrack",
};

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Choisissez un nouveau mot de passe
      </h1>

      <ResetPasswordForm />
    </div>
  );
}
