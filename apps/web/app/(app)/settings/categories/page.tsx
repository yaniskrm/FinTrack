import type { Metadata } from "next";
import { createClient } from "../../../../lib/supabase/server";
import { CategoryView } from "../../../../components/categories/category-view";

export const metadata: Metadata = {
  title: "Catégories — FinTrack",
};

export default async function CategoriesSettingsPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return <CategoryView initialCategories={categories ?? []} />;
}
