"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { signUpAction } from "../../../lib/auth/actions";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (!consent) {
      setError("Vous devez accepter la politique de confidentialité.");
      return;
    }

    startTransition(async () => {
      const result = await signUpAction({
        email: email.trim(),
        password,
        confirmPassword,
        consent,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setEmailSent(true);
      }
    });
  }

  if (emailSent) {
    return (
      <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
        Compte créé. Vérifiez votre email pour confirmer votre inscription.
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

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          placeholder="8 caractères minimum"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
          }}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          required
          disabled={isPending}
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
          }}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          J&apos;accepte la{" "}
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4 decoration-primary hover:decoration-2">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
