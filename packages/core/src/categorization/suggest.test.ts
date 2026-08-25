import { describe, expect, it } from "vitest";
import { suggestCategoryId } from "./suggest.js";
import type { Category } from "../types/index.js";

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat1",
    workspace_id: "ws1",
    name: "Divers",
    icon: "📦",
    color: "#000",
    is_default: true,
    hidden: false,
    ...overrides,
  };
}

const categories: Category[] = [
  makeCategory({ id: "food", name: "Alimentation" }),
  makeCategory({ id: "transport", name: "Transport" }),
  makeCategory({ id: "housing", name: "Logement" }),
  makeCategory({ id: "health", name: "Santé" }),
  makeCategory({ id: "sport", name: "Sport" }),
  makeCategory({ id: "restaurants", name: "Restaurants" }),
  makeCategory({ id: "leisure", name: "Loisirs" }),
  makeCategory({ id: "shopping", name: "Shopping" }),
  makeCategory({ id: "subscriptions", name: "Abonnements" }),
  makeCategory({ id: "travel", name: "Voyages" }),
  makeCategory({ id: "education", name: "Éducation" }),
  makeCategory({ id: "salary", name: "Salaire" }),
  makeCategory({ id: "misc", name: "Divers" }),
];

describe("suggestCategoryId — keyword rules", () => {
  const cases: [string, string][] = [
    ["Carrefour City", "food"],
    ["LIDL", "food"],
    ["Uber trip", "transport"],
    ["SNCF billet", "transport"],
    ["Loyer appartement", "housing"],
    ["Pharmacie du centre", "health"],
    ["Abonnement Basic Fit", "sport"],
    ["Dîner McDonald's", "restaurants"],
    ["UGC Ciné Cité", "leisure"],
    ["Commande amazon.fr", "shopping"],
    ["Netflix mensuel", "subscriptions"],
    ["Vol Air France", "travel"],
    ["Cours Udemy", "education"],
    ["Virement salaire", "salary"],
  ];

  it.each(cases)("matches %s to the right category", (label, expectedId) => {
    expect(suggestCategoryId({ label }, categories)).toBe(expectedId);
  });

  it("matches against the merchant field, not just the label", () => {
    expect(suggestCategoryId({ label: "Courses", merchant: "Monoprix" }, categories)).toBe("food");
  });

  it("is case-insensitive", () => {
    expect(suggestCategoryId({ label: "netflix ABONNEMENT" }, categories)).toBe("subscriptions");
  });

  it("returns null when nothing matches", () => {
    expect(suggestCategoryId({ label: "Quelque chose de totalement inconnu" }, categories)).toBeNull();
  });

  it("returns null for an empty label and no merchant", () => {
    expect(suggestCategoryId({ label: "" }, categories)).toBeNull();
  });

  it("ignores a keyword rule whose category was renamed away", () => {
    const renamed = categories.map((c) => (c.id === "food" ? { ...c, name: "Bouffe" } : c));
    expect(suggestCategoryId({ label: "Carrefour" }, renamed)).toBeNull();
  });

  it("ignores a keyword rule whose category is hidden", () => {
    const hidden = categories.map((c) => (c.id === "food" ? { ...c, hidden: true } : c));
    expect(suggestCategoryId({ label: "Carrefour" }, hidden)).toBeNull();
  });
});

describe("suggestCategoryId — history takes priority over keywords", () => {
  it("reuses the category from a past transaction with the same merchant", () => {
    const history = [{ label: "Dépense récurrente", merchant: "Chez Tonton Pierre", category_id: "leisure" }];
    expect(suggestCategoryId({ label: "Dépense", merchant: "Chez Tonton Pierre" }, categories, history)).toBe(
      "leisure",
    );
  });

  it("matches on label when neither the past nor the new transaction has a merchant", () => {
    const history = [{ label: "Cotisation asso", merchant: null, category_id: "misc" }];
    expect(suggestCategoryId({ label: "Cotisation asso" }, categories, history)).toBe("misc");
  });

  it("overrides what a keyword rule would have suggested", () => {
    // "Uber" would normally match Transport, but this workspace has always
    // filed this specific merchant under Loisirs (e.g. Uber Eats mislabeled).
    const history = [{ label: "Repas", merchant: "Uber", category_id: "leisure" }];
    expect(suggestCategoryId({ label: "Repas", merchant: "Uber" }, categories, history)).toBe("leisure");
  });

  it("falls back to keyword rules when the history match has no category", () => {
    const history = [{ label: "Uber", merchant: "Uber", category_id: null }];
    expect(suggestCategoryId({ label: "Uber" }, categories, history)).toBe("transport");
  });

  it("falls back to keyword rules when the history category no longer exists", () => {
    const history = [{ label: "Repas", merchant: "Uber", category_id: "deleted-category" }];
    expect(suggestCategoryId({ label: "Repas", merchant: "Uber" }, categories, history)).toBe("transport");
  });

  it("does not match a different merchant's history", () => {
    const history = [{ label: "Repas", merchant: "Uber", category_id: "leisure" }];
    expect(suggestCategoryId({ label: "Course", merchant: "Lidl" }, categories, history)).toBe("food");
  });
});
