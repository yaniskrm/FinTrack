import { createClient } from "../../../lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Connecté en tant que {user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bientôt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Solde, graphiques et prochains prélèvements arrivent en Phase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
