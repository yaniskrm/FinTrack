import { describe, expect, it } from "vitest";
import { parseBankStatement } from "./bank-statement.js";

// Synthetic fixture only — modeled on a real Revolut CSV export's shape
// (columns, fee/status semantics), never real account data.
const REVOLUT_HEADER =
  "Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde";

function revolutCsv(rows: string): string {
  return `${REVOLUT_HEADER}\n${rows}`;
}

describe("parseBankStatement — Revolut-shaped export", () => {
  it("parses a simple expense and income row", () => {
    const csv = revolutCsv(
      [
        "Paiement par carte,Valeur actuelle,2026-08-01 10:00:00,2026-08-01 10:00:01,Boulangerie,-4.50,0.00,EUR,TERMINÉ,95.50",
        "Ajout de fonds,Valeur actuelle,2026-08-02 09:00:00,2026-08-02 09:00:01,Recharge,100.00,0.00,EUR,TERMINÉ,195.50",
      ].join("\n"),
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.error).toBeNull();
    expect(result.rows).toEqual([
      { date: "2026-08-01", label: "Boulangerie", amount: 4.5, type: "expense", currency: "EUR" },
      { date: "2026-08-02", label: "Recharge", amount: 100, type: "income", currency: "EUR" },
    ]);
  });

  it("nets a fee against a zero-amount row into a standalone expense", () => {
    const csv = revolutCsv(
      "Valider le paiement,Valeur actuelle,2026-08-14 12:18:25,2026-08-14 12:18:25,Frais d'abonnement,0.00,10.99,EUR,TERMINÉ,113.83",
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows).toEqual([
      { date: "2026-08-14", label: "Frais d'abonnement", amount: 10.99, type: "expense", currency: "EUR" },
    ]);
  });

  it("nets a fee against a negative amount (fee adds to the outflow)", () => {
    const csv = revolutCsv(
      "Virement,Valeur actuelle,2026-08-22 23:05:35,2026-08-22 23:05:37,Virement sortant,-13.00,0.62,EUR,TERMINÉ,89.56",
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows[0]?.amount).toBe(13.62);
    expect(result.rows[0]?.type).toBe("expense");
  });

  it("skips rows with a non-final status (pending, reversed)", () => {
    const csv = revolutCsv(
      [
        "Ajout de fonds,Valeur actuelle,2026-08-27 13:12:15,,Recharge,420.00,0.00,EUR,EN ATTENTE,",
        "Paiement par carte,Valeur actuelle,2026-08-01 14:38:31,,Achat annulé,-24.07,0.00,EUR,RENVOYÉ,",
        "Paiement par carte,Valeur actuelle,2026-08-01 10:00:00,2026-08-01 10:00:01,Boulangerie,-4.50,0.00,EUR,TERMINÉ,95.50",
      ].join("\n"),
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.label).toBe("Boulangerie");
    expect(result.skippedCount).toBe(2);
  });

  it("skips a row whose net amount is exactly zero", () => {
    const csv = revolutCsv(
      "Changes,Valeur actuelle,2026-08-02 00:17:19,2026-08-02 00:17:19,Change,0.00,0.00,EUR,TERMINÉ,174.82",
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("uses each row's own currency when the column has a supported code", () => {
    const csv = revolutCsv(
      "Paiement par carte,Valeur actuelle,2026-08-26 06:32:51,2026-08-26 06:32:52,Grab,-4.24,0.00,SGD,TERMINÉ,50.00",
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows[0]?.currency).toBe("SGD");
  });

  it("falls back to the given default currency when the cell isn't a supported code", () => {
    const csv = revolutCsv(
      "Paiement par carte,Valeur actuelle,2026-08-01 10:00:00,2026-08-01 10:00:01,Boulangerie,-4.50,0.00,???,TERMINÉ,95.50",
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows[0]?.currency).toBe("EUR");
  });

  it("never produces a transfer row", () => {
    const csv = revolutCsv(
      "Virement,Valeur actuelle,2026-08-25 16:14:39,2026-08-25 16:14:40,To Someone,-28.00,0.00,EUR,TERMINÉ,25.83",
    );
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows[0]?.type).not.toBe("transfer");
  });
});

describe("parseBankStatement — generic/other bank formats", () => {
  it("parses a semicolon-delimited file with a decimal comma", () => {
    const csv = "Date;Libellé;Montant\n01/08/2026;Courses;-45,90";
    const result = parseBankStatement(csv, "EUR");
    expect(result.error).toBeNull();
    expect(result.rows).toEqual([{ date: "2026-08-01", label: "Courses", amount: 45.9, type: "expense", currency: "EUR" }]);
  });

  it("parses English column headers", () => {
    const csv = "Date,Description,Amount\n2026-08-01,Groceries,-45.90";
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows).toEqual([{ date: "2026-08-01", label: "Groceries", amount: 45.9, type: "expense", currency: "EUR" }]);
  });

  it("returns an error when required columns can't be found", () => {
    const csv = "Foo,Bar\n1,2";
    const result = parseBankStatement(csv, "EUR");
    expect(result.error).not.toBeNull();
    expect(result.rows).toHaveLength(0);
  });

  it("returns an error for an empty file", () => {
    const result = parseBankStatement("", "EUR");
    expect(result.error).not.toBeNull();
  });

  it("skips a row with an unparsable date or amount rather than throwing", () => {
    const csv = [
      "Date,Description,Amount",
      "not-a-date,Courses,-10.00",
      "2026-08-01,Loyer,not-a-number",
      "2026-08-02,Salaire,2000.00",
    ].join("\n");
    const result = parseBankStatement(csv, "EUR");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.label).toBe("Salaire");
    expect(result.skippedCount).toBe(2);
  });
});
