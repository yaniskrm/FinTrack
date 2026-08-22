"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { enrollTotpAction, verifyEnrollmentAction } from "../../../../lib/auth/mfa";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function EnrollTotp() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEnrollment() {
    setError(null);
    startTransition(async () => {
      const result = await enrollTotpAction();
      if ("error" in result) {
        setError(result.error);
      } else {
        setEnrollment(result);
      }
    });
  }

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!enrollment) {
      return;
    }

    startTransition(async () => {
      const result = await verifyEnrollmentAction({
        factorId: enrollment.factorId,
        code: code.trim(),
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (!enrollment) {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" onClick={startEnrollment} disabled={isPending}>
          {isPending ? "Chargement…" : "Activer la 2FA"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-5">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Scannez ce QR code avec votre application d&apos;authentification.</li>
        <li>Saisissez le code à 6 chiffres généré pour confirmer.</li>
      </ol>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Supabase returns an inline SVG data URI — a plain <img> is correct here
            (next/image can't optimize data URIs and would need extra config). */}
        <img
          src={enrollment.qrCode}
          alt="QR code de configuration 2FA"
          className="size-40 shrink-0 rounded-lg border bg-white p-2"
        />

        <div className="min-w-0 space-y-4">
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Saisir la clé manuellement</summary>
            <code className="mt-1 block rounded bg-muted p-2 break-all">{enrollment.secret}</code>
          </details>

          <div className="space-y-2">
            <Label htmlFor="code">Code de vérification</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              disabled={isPending}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="123456"
              className="w-40 text-center text-lg tracking-[0.3em]"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Vérification…" : "Confirmer"}
      </Button>
    </form>
  );
}
