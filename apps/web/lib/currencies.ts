import type { Currency } from "@fintrack/core";

/**
 * Presentation metadata for a currency, derived automatically:
 *  - flag: emoji built from the ISO country prefix of the code (e.g. THB → TH → 🇹🇭).
 *  - name: localized French name via Intl.DisplayNames.
 *
 * Emoji flags render on macOS/iOS/Android; on Windows they degrade to country
 * letters, but the currency code is always shown alongside, so nothing is lost.
 */

const displayNames = new Intl.DisplayNames(["fr"], { type: "currency" });

// Codes whose first two letters aren't a flag-bearing country — regional
// currencies (CFA francs, East Caribbean, CFP) or deprecated ISO codes.
const FLAG_OVERRIDES: Partial<Record<Currency, string>> = {
  XAF: "🌍",
  XOF: "🌍",
  XCD: "🏝️",
  XCG: "🏝️",
  ANG: "🏝️",
  XPF: "🇵🇫",
};

function flagFromCode(code: string): string {
  return code
    .slice(0, 2)
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

export function currencyMeta(code: Currency): { flag: string; name: string } {
  const raw = displayNames.of(code) ?? code;
  return {
    flag: FLAG_OVERRIDES[code] ?? flagFromCode(code),
    name: raw.charAt(0).toUpperCase() + raw.slice(1),
  };
}
