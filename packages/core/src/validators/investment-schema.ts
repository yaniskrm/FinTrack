import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "../types/index.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const investmentTypeSchema = z.enum(["etf", "stock", "scpi", "savings", "crypto", "other"]);

/**
 * Shared position input schema — create/edit an open investment. Mirrors
 * `budgetInputSchema`'s split: this covers the position itself; adding a
 * valuation snapshot or closing a position are separate, smaller schemas
 * below (distinct user actions, distinct forms).
 */
export const investmentInputSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(200),
  assetType: investmentTypeSchema,
  ticker: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  broker: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  quantity: z.number({ message: "Quantité invalide" }).positive("La quantité doit être supérieure à 0"),
  buyPriceEur: z.number({ message: "Prix d'achat invalide" }).positive("Le prix d'achat doit être supérieur à 0"),
  currentPriceEur: z
    .number({ message: "Prix actuel invalide" })
    .nonnegative("Le prix actuel ne peut pas être négatif"),
  currency: z.enum(SUPPORTED_CURRENCIES),
  openedAt: z.string().regex(ISO_DATE, "Date invalide (AAAA-MM-JJ)").nullable(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .transform((v) => (v === "" ? null : v)),
});

export type InvestmentFormValues = z.infer<typeof investmentInputSchema>;

/** Record a new valuation snapshot for an open position (history + refreshes current_price_eur). */
export const investmentValuationInputSchema = z.object({
  investmentId: z.uuid("Position requise"),
  priceEur: z.number({ message: "Prix invalide" }).nonnegative("Le prix ne peut pas être négatif"),
  recordedAt: z.string().regex(ISO_DATE, "Date invalide (AAAA-MM-JJ)"),
});

export type InvestmentValuationFormValues = z.infer<typeof investmentValuationInputSchema>;

/** Close a position (sell it) — sets closed_at + sale_price_eur together. */
export const closeInvestmentSchema = z.object({
  investmentId: z.uuid("Position requise"),
  salePriceEur: z.number({ message: "Prix de vente invalide" }).nonnegative("Le prix de vente ne peut pas être négatif"),
  closedAt: z.string().regex(ISO_DATE, "Date invalide (AAAA-MM-JJ)"),
});

export type CloseInvestmentFormValues = z.infer<typeof closeInvestmentSchema>;
