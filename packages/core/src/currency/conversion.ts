import type { Currency, ExchangeRate } from "../types/index.js";

/**
 * Converts an amount from a given currency to EUR using a pre-fetched rate.
 * The rate is frozen at entry time — this function MUST NOT be called
 * with live rates for historical transactions.
 */
export function convertToEur(amount: number, currency: Currency, rates: ExchangeRate[]): number {
  if (currency === "EUR") return amount;

  const rate = rates.find((r) => r.currency === currency);
  if (!rate) throw new Error(`No exchange rate found for currency: ${currency}`);

  return amount * rate.rate_to_eur;
}

/**
 * Converts an amount from EUR to a target currency.
 */
export function convertFromEur(
  amountEur: number,
  targetCurrency: Currency,
  rates: ExchangeRate[],
): number {
  if (targetCurrency === "EUR") return amountEur;

  const rate = rates.find((r) => r.currency === targetCurrency);
  if (!rate) throw new Error(`No exchange rate found for currency: ${targetCurrency}`);

  return amountEur / rate.rate_to_eur;
}
