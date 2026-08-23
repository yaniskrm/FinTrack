import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shared savings-goal input schema — used by the client form (React Hook Form
 * resolver) AND server-side validation. Stored directly in EUR.
 */
export const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(100, "Nom trop long (100 max)"),
  targetAmountEur: z
    .number({ message: "Montant invalide" })
    .positive("Le montant cible doit être supérieur à 0"),
  currentAmountEur: z
    .number({ message: "Montant invalide" })
    .min(0, "Le montant actuel ne peut pas être négatif"),
  deadline: z.string().regex(ISO_DATE, "Date invalide (AAAA-MM-JJ)").nullable(),
});

export type GoalFormValues = z.infer<typeof goalInputSchema>;
