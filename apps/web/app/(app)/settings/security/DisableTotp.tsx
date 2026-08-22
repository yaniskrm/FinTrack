"use client";

import { useState, useTransition } from "react";
import { disableTotpAction } from "../../../../lib/auth/mfa";
import { Button } from "../../../../components/ui/button";

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
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setConfirming(true);
        }}
      >
        Désactiver la 2FA
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Confirmez la désactivation de la double authentification ? Votre compte sera moins protégé.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="destructive" onClick={handleDisable} disabled={isPending}>
          {isPending ? "Désactivation…" : "Oui, désactiver"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setConfirming(false);
          }}
          disabled={isPending}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
