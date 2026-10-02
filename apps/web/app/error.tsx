"use client";

import Link from "next/link";
import { Button } from "../components/ui/button";
import { StatusPage } from "../components/status-page";

// Deliberately never prints `error.message`: it can carry request or data
// details. The digest is an opaque id that matches the server-side log line.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage
      eyebrow="ERREUR"
      title="Une erreur est survenue"
      description="Quelque chose s'est mal passé de notre côté. Vos données n'ont pas été modifiées. Réessayez dans un instant."
      reference={error.digest}
    >
      <Button type="button" onClick={reset}>
        Réessayer
      </Button>
      <Button asChild variant="outline">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </StatusPage>
  );
}
