"use client";

import "./globals.css";
import { Button } from "../components/ui/button";
import { StatusPage } from "../components/status-page";

// Last-resort boundary: it REPLACES the root layout (no providers, no theme
// provider, no metadata), so it must bring its own <html>/<body> and the
// stylesheet. A plain <a> instead of next/link — the router may be what broke.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <StatusPage
          eyebrow="ERREUR"
          title="Une erreur est survenue"
          description="FinTrack a rencontré un problème inattendu. Vos données n'ont pas été modifiées. Réessayez dans un instant."
          reference={error.digest}
        >
          <Button type="button" onClick={reset}>
            Réessayer
          </Button>
          <Button asChild variant="outline">
            <a href="/">Retour à l&apos;accueil</a>
          </Button>
        </StatusPage>
      </body>
    </html>
  );
}
