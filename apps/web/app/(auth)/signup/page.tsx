import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Créer un compte — FinTrack",
};

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Créer un compte</CardTitle>
        <CardDescription>Commencez à suivre vos finances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SignUpForm />
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4 decoration-primary hover:decoration-2">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
