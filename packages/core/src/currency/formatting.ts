import type { Currency } from "../types/index.js";

/**
 * Formats a number as a localized currency string.
 * Uses Intl.NumberFormat — safe for Node.js and React Native (Hermes).
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  locale = "fr-FR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns the currency symbol for display purposes.
 */
export function getCurrencySymbol(currency: Currency, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "symbol" })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? currency;
}
