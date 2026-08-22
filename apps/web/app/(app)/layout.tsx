import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "../../lib/supabase/server";
import { IdleTimeout } from "../../components/IdleTimeout";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware already redirects unauthenticated
  // requests, but protected data-bearing layouts should never trust that
  // alone (Supabase's own SSR guidance).
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <IdleTimeout />
      {children}
    </>
  );
}
