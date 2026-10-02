import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "../components/ui/button";
import { StatusPage } from "../components/status-page";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="ERREUR 404"
      title="Page introuvable"
      description="Cette page n'existe pas ou a été déplacée."
    >
      {/* "/" sends a signed-in user to the dashboard and everyone else to the login. */}
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </StatusPage>
  );
}
