"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { verifyChallengeAction } from "../../lib/auth/mfa";

export function MfaChallengeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await verifyChallengeAction({ code: code.trim() });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        disabled={isPending}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, ""));
        }}
        placeholder="123456"
        aria-label="Code de vérification"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-center text-xl tracking-[0.4em] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
      />

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {isPending ? "Vérification…" : "Vérifier"}
      </button>
    </form>
  );
}
