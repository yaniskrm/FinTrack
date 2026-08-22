"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { enrollTotpAction, verifyEnrollmentAction } from "../../../../lib/auth/mfa";

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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={startEnrollment}
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? "Chargement…" : "Activer la 2FA"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <ol className="list-decimal space-y-3 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
        <li>Scannez ce QR code avec votre application d&apos;authentification.</li>
        <li>Saisissez le code à 6 chiffres généré pour confirmer.</li>
      </ol>

      {/* Supabase returns an inline SVG data URI — a plain <img> is correct here
          (next/image can't optimize data URIs and would need extra config). */}
      <img
        src={enrollment.qrCode}
        alt="QR code de configuration 2FA"
        className="h-44 w-44 rounded-lg bg-white p-2"
      />

      <details className="text-xs text-neutral-500">
        <summary className="cursor-pointer">Saisir la clé manuellement</summary>
        <code className="mt-1 block break-all rounded bg-neutral-100 p-2 dark:bg-neutral-900">
          {enrollment.secret}
        </code>
      </details>

      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Code de vérification
        </label>
        <input
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
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {isPending ? "Vérification…" : "Confirmer"}
      </button>
    </form>
  );
}
