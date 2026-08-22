"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { requestPasswordResetAction } from "../../../lib/auth/actions";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email: email.trim() });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
        Si un compte existe pour cette adresse, un email de réinitialisation vient d&apos;être
        envoyé.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Envoi…" : "Envoyer le lien"}
      </Button>
    </form>
  );
}
