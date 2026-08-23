import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — FinTrack",
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Bienvenue</CardTitle>
        <CardDescription>Connectez-vous à votre compte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4 decoration-primary hover:decoration-2">
            Créer un compte
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
