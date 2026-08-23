import type { Metadata } from "next";
import { getMfaStatus } from "../../../../lib/auth/mfa";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { EnrollTotp } from "./EnrollTotp";
import { DisableTotp } from "./DisableTotp";

export const metadata: Metadata = {
  title: "Sécurité — FinTrack",
};

export default async function SecuritySettingsPage() {
  const { enrolled, factorId } = await getMfaStatus();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sécurité</h1>
        <p className="text-sm text-muted-foreground">
          Gérez la protection de votre compte.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Double authentification (2FA)</CardTitle>
              <CardDescription>
                Un code à usage unique (Google Authenticator, Authy, 1Password…) en plus de votre
                mot de passe.
              </CardDescription>
            </div>
            {enrolled && (
              <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                Activée
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {enrolled && factorId ? <DisableTotp factorId={factorId} /> : <EnrollTotp />}
        </CardContent>
      </Card>
    </>
  );
}
