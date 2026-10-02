"use client";

import Link from "next/link";
import { Button } from "../../components/ui/button";
import { StatusPage } from "../../components/status-page";

// Error boundary for the authenticated app: it renders inside AppShell, so the
// navigation stays usable and the user can go elsewhere without a reload.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage
      standalone={false}
      eyebrow="ERREUR"
      title="Impossible d'afficher cette page"
      description="Une erreur est survenue en chargeant cette page. Vos données n'ont pas été modifiées."
      reference={error.digest}
    >
      <Button type="button" onClick={reset}>
        Réessayer
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard">Tableau de bord</Link>
      </Button>
    </StatusPage>
  );
}
