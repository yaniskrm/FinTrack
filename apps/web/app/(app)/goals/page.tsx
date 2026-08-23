import type { Metadata } from "next";
import { createClient } from "../../../lib/supabase/server";
import { GoalView } from "../../../components/goals/goal-view";

export const metadata: Metadata = {
  title: "Objectifs — FinTrack",
};

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: goals } = await supabase.from("goals").select("*").order("created_at", { ascending: true });

  return <GoalView initialGoals={goals ?? []} />;
}
