"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { DELETE_ACCOUNT_CONFIRMATION_WORD } from "@fintrack/core";
import { deleteAccountAction } from "../../../../lib/auth/delete-account";
import { Turnstile, useCaptcha } from "../../../../components/turnstile";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

export function DeleteAccountForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const captcha = useCaptcha();

  const confirmed = confirmation.trim() === DELETE_ACCOUNT_CONFIRMATION_WORD;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      // On success the action redirects to /login and this never returns.
      const result = await deleteAccountAction({ password, confirmation, captchaToken: captcha.token });
      if (result?.error) {
        setError(result.error);
        captcha.reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Toutes vos données sont supprimées : transactions, comptes, budgets, objectifs, investissements.</li>
        <li>Vos connexions bancaires sont révoquées.</li>
        <li>
          <strong className="font-medium text-foreground">Cette action est définitive</strong> : nous ne pourrons pas
          la défaire.
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Besoin d&apos;une copie ?{" "}
        <Link
          href="/settings/export"
          className="font-medium text-foreground underline underline-offset-4 decoration-primary hover:decoration-2"
        >
          Téléchargez d&apos;abord votre sauvegarde
        </Link>
        .
      </p>

      <div className="space-y-2">
        <Label htmlFor="deletePassword">Mot de passe</Label>
        <Input
          id="deletePassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="deleteConfirmation">
          Pour confirmer, tapez <span className="font-semibold">{DELETE_ACCOUNT_CONFIRMATION_WORD}</span>
        </Label>
        <Input
          id="deleteConfirmation"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          disabled={isPending}
          value={confirmation}
          onChange={(e) => {
            setConfirmation(e.target.value);
          }}
        />
      </div>

      {captcha.enabled && <Turnstile ref={captcha.widgetRef} onToken={captcha.setToken} />}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        variant="destructive"
        disabled={isPending || !confirmed || password.length === 0 || !captcha.ready}
      >
        {isPending ? "Suppression…" : "Supprimer définitivement mon compte"}
      </Button>
    </form>
  );
}
