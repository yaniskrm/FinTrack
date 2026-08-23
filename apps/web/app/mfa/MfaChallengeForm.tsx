"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { verifyChallengeAction } from "../../lib/auth/mfa";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

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
      <Input
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
        className="h-12 text-center text-xl tracking-[0.5em]"
      />

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Vérification…" : "Vérifier"}
      </Button>
    </form>
  );
}
