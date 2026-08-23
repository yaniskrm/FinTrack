"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { updateEmailAction } from "../../../../lib/auth/actions";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateEmailAction({ email });
      if (result.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Vérifiez votre boîte mail — un lien de confirmation a été envoyé à{" "}
        <span className="font-medium text-foreground">{currentEmail}</span> et à{" "}
        <span className="font-medium text-foreground">{email}</span>. Le changement ne prend
        effet qu&apos;une fois les deux confirmés.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentEmail">Email actuel</Label>
        <Input id="currentEmail" type="email" value={currentEmail} disabled readOnly />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newEmail">Nouvel email</Label>
        <Input
          id="newEmail"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          placeholder="nouvelle-adresse@example.com"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Envoi…" : "Changer d'email"}
      </Button>
    </form>
  );
}
