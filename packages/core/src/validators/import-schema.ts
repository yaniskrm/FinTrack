import { z } from "zod";
import { currencySchema } from "./transaction-schema.js";

/**
 * One reviewed-and-confirmed row from the bank statement importer. Mirrors
 * `ParsedStatementRow` (packages/core/src/import/bank-statement.ts) plus the
 * category the user picked/confirmed in the review step — never "transfer"
 * (see that file for why).
 */
export const importRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)"),
  label: z.string().trim().min(1, "Libellé requis").max(100, "Libellé trop long (100 max)"),
  amount: z.number().positive("Le montant doit être supérieur à 0"),
  type: z.enum(["income", "expense"]),
  currency: currencySchema,
  categoryId: z.uuid().nullable(),
});

export const importBatchSchema = z.object({
  accountId: z.uuid("Compte requis"),
  rows: z.array(importRowSchema).min(1, "Aucune ligne à importer").max(1000, "1000 lignes maximum par import"),
});

export type ImportRowInput = z.infer<typeof importRowSchema>;
export type ImportBatchInput = z.infer<typeof importBatchSchema>;
