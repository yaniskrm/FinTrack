"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { signUpAction } from "../../../lib/auth/actions";

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
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        Compte créé. Vérifiez votre email pour confirmer votre inscription.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          value={password}
          onChange={(e) => { setPassword(e.target.value); }}
          placeholder="8 caractères minimum"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Confirmer le mot de passe
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); }}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          required
          disabled={isPending}
          checked={consent}
          onChange={(e) => { setConsent(e.target.checked); }}
          className="mt-0.5"
        />
        <span>
          J&apos;accepte la{" "}
          <Link href="/privacy" className="text-indigo-600 hover:underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {isPending ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
