import { z } from "zod";

export const budgetPeriodSchema = z.enum(["monthly", "yearly"]);

/**
 * Shared budget-envelope input schema — used by the client form (React Hook
 * Form resolver) AND server-side validation. Unlike transactions, budgets are
 * stored directly in EUR (no original-currency/amount pair).
 */
export const budgetInputSchema = z.object({
  categoryId: z.uuid("Catégorie requise"),
  amountEur: z.number({ message: "Montant invalide" }).positive("Le montant doit être supérieur à 0"),
  period: budgetPeriodSchema,
});

export type BudgetFormValues = z.infer<typeof budgetInputSchema>;
