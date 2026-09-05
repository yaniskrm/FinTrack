const displayNames = new Intl.DisplayNames(["fr"], { type: "region" });

function flagFromCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

/** Same emoji-flag derivation as currencyMeta (lib/currencies.ts), for ISO 3166 country codes directly. */
export function countryMeta(code: string): { flag: string; name: string } {
  const raw = displayNames.of(code) ?? code;
  return { flag: flagFromCode(code), name: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

/** Countries covered by Enable Banking's PSD2 aggregation (EEA) — see CLAUDE.md, Phase 13. */
export const ENABLE_BANKING_COUNTRIES = [
  "FR", "DE", "ES", "IT", "NL", "BE", "AT", "PT", "IE", "FI", "SE", "DK", "NO",
  "PL", "GR", "HU", "RO", "BG", "HR", "SI", "SK", "EE", "LV", "LT", "LU",
  "MT", "CY", "IS", "LI",
] as const;
