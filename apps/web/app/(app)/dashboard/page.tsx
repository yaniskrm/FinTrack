import { createClient } from "../../../lib/supabase/server";
import { signOutAction } from "../../../lib/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-neutral-500">
        Connecté en tant que <span className="font-medium">{user?.email}</span>
      </p>
      <p className="text-sm text-neutral-400">Dashboard — arrive en Phase 5.</p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
