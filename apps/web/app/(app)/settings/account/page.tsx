import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Currency } from "@fintrack/core";
import { createClient } from "../../../../lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DefaultCurrencyForm } from "./DefaultCurrencyForm";

export const metadata: Metadata = {
  title: "Compte — FinTrack",
};

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compte</h1>
        <p className="text-sm text-muted-foreground">Gérez votre email et votre mot de passe.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adresse email</CardTitle>
          <CardDescription>
            Le changement nécessite une confirmation depuis votre ancienne et votre nouvelle
            adresse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangeEmailForm currentEmail={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>Votre mot de passe actuel vous sera demandé.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Devise par défaut</CardTitle>
          <CardDescription>
            Pré-remplit la devise à chaque nouvelle transaction — pratique en voyage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DefaultCurrencyForm initialCurrency={(profile?.default_currency as Currency | undefined) ?? "EUR"} />
        </CardContent>
      </Card>
    </>
  );
}
