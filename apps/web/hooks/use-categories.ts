"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CategoryFormValues } from "@fintrack/core";
import { createCategoryAction, setCategoryHiddenAction, updateCategoryAction } from "../lib/categories/actions";

const CATEGORIES_KEY = ["categories"] as const;

export function useCreateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const result = await createCategoryAction(values);
      if (!result.ok) throw new Error(result.error);
      return result.category;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de la création.");
    },
    onSuccess: () => {
      toast.success("Catégorie créée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CategoryFormValues }) => {
      const result = await updateCategoryAction(id, values);
      if (!result.ok) throw new Error(result.error);
      return result.category;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de la modification.");
    },
    onSuccess: () => {
      toast.success("Catégorie modifiée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useSetCategoryHidden() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const result = await setCategoryHiddenAction(id, hidden);
      if (!result.ok) throw new Error(result.error);
      return result.category;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Échec de la mise à jour.");
    },
    onSuccess: (category) => {
      toast.success(category.hidden ? "Catégorie masquée." : "Catégorie affichée.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}
