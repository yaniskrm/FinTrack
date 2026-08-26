import { z } from "zod";
import { currencySchema, transactionTypeSchema } from "./transaction-schema.js";

export const recurringFrequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shared recurring-rule input schema — used by the client form (React Hook Form
 * resolver) AND server-side validation. A rule generates transactions; it is
 * not a transaction itself.
 */
export const recurringInputSchema = z
  .object({
    amount: z.number({ message: "Montant invalide" }).positive("Le montant doit être supérieur à 0"),
    currency: currencySchema,
    type: transactionTypeSchema,
    label: z.string().trim().min(1, "Libellé requis").max(100, "Libellé trop long (100 max)"),
    categoryId: z.uuid().nullable(),
    frequency: recurringFrequencySchema,
    startDate: z.string().regex(ISO_DATE, "Date invalide (AAAA-MM-JJ)"),
    endDate: z.string().regex(ISO_DATE, "Date invalide (AAAA-MM-JJ)").nullable(),
    accountId: z.uuid("Compte requis"),
    toAccountId: z.uuid().nullable(),
  })
  .refine((v) => v.endDate === null || v.endDate > v.startDate, {
    message: "La date de fin doit être après la date de début",
    path: ["endDate"],
  })
  .refine((v) => (v.type === "transfer") === (v.toAccountId !== null), {
    message: "Un virement doit avoir un compte de destination",
    path: ["toAccountId"],
  })
  .refine((v) => v.toAccountId === null || v.toAccountId !== v.accountId, {
    message: "Le compte de destination doit être différent du compte source",
    path: ["toAccountId"],
  });

export type RecurringFormValues = z.infer<typeof recurringInputSchema>;
