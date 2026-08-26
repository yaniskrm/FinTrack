import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "../types/index.js";

export const transactionTypeSchema = z.enum(["expense", "income", "transfer"]);

export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

/**
 * Shared transaction input schema — used by the client form (React Hook Form
 * resolver) AND server-side validation, so both agree on the exact same rules.
 * `amount` is coerced so a string from an <input> and a real number both parse.
 */
export const transactionInputSchema = z
  .object({
    amount: z
      .number({ message: "Montant invalide" })
      .positive("Le montant doit être supérieur à 0"),
    currency: currencySchema,
    type: transactionTypeSchema,
    label: z.string().trim().min(1, "Libellé requis").max(100, "Libellé trop long (100 max)"),
    merchant: z.string().trim().max(100, "Enseigne trop longue (100 max)").nullable(),
    categoryId: z.uuid().nullable(),
    note: z.string().trim().max(500, "Note trop longue (500 max)").nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)"),
    markAsReimbursable: z.boolean(),
    reimbursementContact: z.string().trim().max(100, "Contact trop long (100 max)").nullable(),
    accountId: z.uuid("Compte requis"),
    // Destination account for a transfer — required iff type === "transfer",
    // and never the same as the source account (see DB check constraints).
    toAccountId: z.uuid().nullable(),
  })
  .refine((data) => (data.type === "transfer") === (data.toAccountId !== null), {
    message: "Un virement doit avoir un compte de destination",
    path: ["toAccountId"],
  })
  .refine((data) => data.toAccountId === null || data.toAccountId !== data.accountId, {
    message: "Le compte de destination doit être différent du compte source",
    path: ["toAccountId"],
  });

export type TransactionFormValues = z.infer<typeof transactionInputSchema>;
