import type { Metadata } from "next";

// TEMPLATE — placeholder RGPD copy generated for Phase 1 scaffolding.
// Must be reviewed and finalized with legal counsel before production launch:
// fill in the real data controller identity, DPO contact, and retention
// periods once they're defined.

export const metadata: Metadata = {
  title: "Politique de confidentialité — FinTrack",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-16 text-sm leading-6 text-muted-foreground">
      <h1 className="text-2xl font-bold text-foreground">
        Politique de confidentialité
      </h1>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Responsable du traitement
        </h2>
        <p>[Nom de l&apos;entité responsable du traitement] — [adresse] — [contact].</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Données collectées
        </h2>
        <p>
          Adresse email, mot de passe (chiffré), et les données financières que vous saisissez
          volontairement dans l&apos;application (transactions, budgets, objectifs, investissements).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Finalité et base légale
        </h2>
        <p>
          Ces données sont traitées pour vous fournir le service FinTrack, sur la base de
          l&apos;exécution du contrat qui nous lie (nos conditions d&apos;utilisation).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Durée de conservation
        </h2>
        <p>
          Vos données sont conservées tant que votre compte est actif. [Préciser la durée de
          conservation après suppression du compte.]
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Vos droits (RGPD)
        </h2>
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité de vos données. Pour exercer ces droits,
          contactez [adresse de contact].
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Sécurité
        </h2>
        <p>
          Vos données sont hébergées chez Supabase (PostgreSQL), chiffrées en transit et au
          repos, et protégées par des règles d&apos;accès strictes (Row Level Security) limitant
          chaque utilisateur à ses propres données.
        </p>
      </section>
    </main>
  );
}
