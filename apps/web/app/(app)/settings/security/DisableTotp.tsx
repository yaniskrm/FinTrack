"use client";

import { useState, useTransition } from "react";
import { disableTotpAction } from "../../../../lib/auth/mfa";

export function DisableTotp({ factorId }: { factorId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      const result = await disableTotpAction({ factorId });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
        }}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
      >
        Désactiver la 2FA
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Confirmez la désactivation de la double authentification ? Votre compte sera moins protégé.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDisable}
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
        >
          {isPending ? "Désactivation…" : "Oui, désactiver"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
          }}
          disabled={isPending}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
