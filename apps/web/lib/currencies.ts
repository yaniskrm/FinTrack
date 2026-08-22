import type { Currency } from "@fintrack/core";

/**
 * Presentation metadata for each supported currency: an emoji flag and a
 * French display name. Emoji flags render on macOS/iOS/Android; on Windows they
 * fall back to the country letters, but the currency code is always shown too,
 * so no information is lost.
 */
export const CURRENCY_META: Record<Currency, { flag: string; name: string }> = {
  EUR: { flag: "🇪🇺", name: "Euro" },
  USD: { flag: "🇺🇸", name: "Dollar américain" },
  GBP: { flag: "🇬🇧", name: "Livre sterling" },
  CHF: { flag: "🇨🇭", name: "Franc suisse" },
  JPY: { flag: "🇯🇵", name: "Yen japonais" },
  CAD: { flag: "🇨🇦", name: "Dollar canadien" },
  AUD: { flag: "🇦🇺", name: "Dollar australien" },
  AED: { flag: "🇦🇪", name: "Dirham émirati" },
  BRL: { flag: "🇧🇷", name: "Real brésilien" },
  CNY: { flag: "🇨🇳", name: "Yuan chinois" },
  CZK: { flag: "🇨🇿", name: "Couronne tchèque" },
  DKK: { flag: "🇩🇰", name: "Couronne danoise" },
  HKD: { flag: "🇭🇰", name: "Dollar de Hong Kong" },
  HUF: { flag: "🇭🇺", name: "Forint hongrois" },
  IDR: { flag: "🇮🇩", name: "Roupie indonésienne" },
  ILS: { flag: "🇮🇱", name: "Shekel israélien" },
  INR: { flag: "🇮🇳", name: "Roupie indienne" },
  ISK: { flag: "🇮🇸", name: "Couronne islandaise" },
  KRW: { flag: "🇰🇷", name: "Won sud-coréen" },
  MAD: { flag: "🇲🇦", name: "Dirham marocain" },
  MXN: { flag: "🇲🇽", name: "Peso mexicain" },
  MYR: { flag: "🇲🇾", name: "Ringgit malaisien" },
  NOK: { flag: "🇳🇴", name: "Couronne norvégienne" },
  NZD: { flag: "🇳🇿", name: "Dollar néo-zélandais" },
  PHP: { flag: "🇵🇭", name: "Peso philippin" },
  PLN: { flag: "🇵🇱", name: "Złoty polonais" },
  RON: { flag: "🇷🇴", name: "Leu roumain" },
  SEK: { flag: "🇸🇪", name: "Couronne suédoise" },
  SGD: { flag: "🇸🇬", name: "Dollar de Singapour" },
  THB: { flag: "🇹🇭", name: "Baht thaïlandais" },
  TRY: { flag: "🇹🇷", name: "Livre turque" },
  ZAR: { flag: "🇿🇦", name: "Rand sud-africain" },
};
