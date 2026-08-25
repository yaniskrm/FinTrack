import type { Category } from "../types/index.js";

export interface CategorySuggestionInput {
  label: string;
  merchant?: string | null;
}

/** Minimal shape of a past transaction, for the history-based suggestion. */
export interface HistoricalTransaction {
  label: string;
  merchant: string | null;
  category_id: string | null;
}

interface KeywordRule {
  pattern: RegExp;
  categoryName: string;
}

/**
 * Deterministic, no-ML keyword rules against the app's default category
 * names (see 20260823000003_category_sport.sql) — a workspace that renamed
 * or hid a default category simply won't get that rule's suggestions
 * anymore (matched by name at call time, not by a fixed id).
 */
const KEYWORD_RULES: KeywordRule[] = [
  {
    categoryName: "Alimentation",
    pattern: /carrefour|monoprix|leclerc|\blidl\b|auchan|intermarch[ée]|franprix|casino|biocoop|naturalia|picard|boulangerie|supermarch[ée]|epicerie|[ée]picerie/i,
  },
  {
    categoryName: "Transport",
    pattern: /\buber\b|\bbolt\b|\bsncf\b|\bratp\b|\bter\b|\btgv\b|\btaxi\b|blablacar|navigo|v[ée]lib|\bessence\b|\bparking\b|autoroute|total ?energies|\bshell\b|\bbp\b(?!\w)/i,
  },
  {
    categoryName: "Logement",
    pattern: /\bloyer\b|\bedf\b|\bengie\b|\bveolia\b|\borange\b|\bsfr\b|bouygues|\bfree\b|assurance habitation|\bsyndic\b/i,
  },
  {
    categoryName: "Santé",
    pattern: /pharmacie|m[ée]decin|docteur|dentiste|mutuelle|laboratoire|h[oô]pital|clinique|opticien/i,
  },
  {
    categoryName: "Sport",
    pattern: /decathlon|basic ?fit|fitness ?park|salle de sport|piscine|klesport|gymlib/i,
  },
  {
    categoryName: "Restaurants",
    pattern: /restaurant|mcdonald|burger king|\bkfc\b|deliveroo|uber ?eats|just ?eat|brasserie|\bcaf[ée]\b|starbucks/i,
  },
  {
    categoryName: "Loisirs",
    pattern: /cin[ée]ma|\bugc\b|path[ée]|gaumont|\bfnac\b|concert|th[ée][aâ]tre|\bsteam\b|playstation store|nintendo/i,
  },
  {
    categoryName: "Shopping",
    pattern: /amazon\.|zalando|\bh&m\b|\bzara\b|uniqlo|\bikea\b|boulanger|\bdarty\b|cdiscount/i,
  },
  {
    categoryName: "Abonnements",
    pattern: /netflix|spotify|disney\+?|deezer|canal\+|amazon prime|youtube premium|apple music|playstation plus|xbox game pass|icloud/i,
  },
  {
    categoryName: "Voyages",
    pattern: /air ?france|easyjet|ryanair|booking\.com|airbnb|\bh[oô]tel\b|sncf ?connect/i,
  },
  {
    categoryName: "Éducation",
    pattern: /udemy|coursera|universit[ée]|\bfac\b|formation/i,
  },
  {
    categoryName: "Salaire",
    pattern: /\bsalaire\b|\bpaie\b|virement employeur/i,
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Suggests a category for a new transaction: (1) if a past transaction with
 * the same merchant (or label, when no merchant) was categorized before,
 * reuse that — the strongest, most personal signal; (2) otherwise match
 * known merchant/keyword patterns against the workspace's own category
 * names. Returns `null` rather than guessing when nothing matches —
 * suggesting the wrong category is worse than suggesting none.
 */
export function suggestCategoryId(
  input: CategorySuggestionInput,
  categories: Category[],
  history: HistoricalTransaction[] = [],
): string | null {
  const visible = categories.filter((c) => !c.hidden);
  const needle = normalize(`${input.merchant ?? ""} ${input.label}`);
  if (needle.length === 0) return null;

  const inputKey = normalize(input.merchant ?? input.label);
  const historyMatch = history.find((h) => normalize(h.merchant ?? h.label) === inputKey && h.category_id !== null);
  if (historyMatch?.category_id && visible.some((c) => c.id === historyMatch.category_id)) {
    return historyMatch.category_id;
  }

  for (const rule of KEYWORD_RULES) {
    if (!rule.pattern.test(needle)) continue;
    const match = visible.find((c) => normalize(c.name) === normalize(rule.categoryName));
    if (match) return match.id;
  }

  return null;
}
