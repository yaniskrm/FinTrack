import { z } from "zod";
import { currencySchema } from "./transaction-schema.js";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const accountTypeSchema = z.enum(["checking", "savings", "investment", "cash", "other"]);

/**
 * Shared account input schema — used by the client form (React Hook Form
 * resolver) AND server-side validation. `initialBalance` may be negative
 * (a credit card's starting balance is a debt) — unlike transaction
 * amounts, which must be positive.
 */
export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(50, "Nom trop long (50 max)"),
  type: accountTypeSchema,
  currency: currencySchema,
  initialBalance: z.number({ message: "Solde initial invalide" }),
  icon: z.string().trim().min(1, "Icône requise").max(8, "Icône invalide"),
  color: z.string().regex(HEX_COLOR_RE, "Couleur invalide (format #RRGGBB)"),
});

export type AccountFormValues = z.infer<typeof accountInputSchema>;
