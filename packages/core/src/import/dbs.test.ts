import { describe, expect, it } from "vitest";
import { parseCsv } from "./parse-csv.js";
import { parseBankStatement } from "./bank-statement.js";
import { detectDbsHeaderIndex, scrubCardNumbers } from "./dbs.js";

// Synthetic fixture only — modeled on a real DBS (Singapore) CSV export's
// shape (8-line preamble, split Debit/Credit columns, BAT/ADV vocabulary),
// never real account data. Card/account numbers below are fake, chosen to
// be obviously fake (sequential digits) while still matching the real
// shapes (4 groups of 4 digits for a card, "NNN-NNNNN-N" for an account).
const DBS_PREAMBLE = [
  '"Account Details For:","My Account 999-99999-9",,,,,,,,,,',
  '"Statement as at:","01 Oct 2026",,,,,,,,,,',
  '"",,,,,,,,,,,',
  '"Currency:","SGD - Singapore Dollar",,,,,,,,,,',
  '"",,,,,,,,,,,',
  '"Available Balance:","SGD 999.99",,,,,,,,,,',
  '"Ledger Balance:","SGD 999.99",,,,,,,,,,',
  '"",,,,,,,,,,,',
].join("\n");

const DBS_HEADER =
  '"Transaction Date","Value Date","Statement Code","Description","Supplementary Code","Supplementary Code Description","Client Reference","Additional Reference","Status","Currency","Debit Amount","Credit Amount"';

function dbsCsv(rows: string[]): string {
  return [DBS_PREAMBLE, DBS_HEADER, ...rows].join("\n");
}

describe("detectDbsHeaderIndex", () => {
  it("finds the header row after an 8-line preamble", () => {
    const table = parseCsv(dbsCsv([]));
    expect(detectDbsHeaderIndex(table)).toBe(8);
  });

  it("finds the header regardless of preamble length", () => {
    const table = parseCsv(["extra,preamble,line", DBS_PREAMBLE, DBS_HEADER].join("\n"));
    expect(detectDbsHeaderIndex(table)).toBe(9);
  });

  it("returns null for a non-DBS (Revolut-shaped) file", () => {
    const table = parseCsv("Type,Produit,Date de début,Description,Montant,Devise,État\nfoo,bar,2026-08-01,baz,-1,EUR,TERMINÉ");
    expect(detectDbsHeaderIndex(table)).toBeNull();
  });
});

describe("scrubCardNumbers", () => {
  it("strips a dash-separated card number", () => {
    expect(scrubCardNumbers("foo 1234-5678-9012-3456 bar")).toBe("foo bar");
  });

  it("strips a space-separated card number", () => {
    expect(scrubCardNumbers("foo 1234 5678 9012 3456 bar")).toBe("foo bar");
  });

  it("strips a bare 16-digit run with no separators", () => {
    expect(scrubCardNumbers("foo 1234567890123456 bar")).toBe("foo bar");
  });

  it("does not touch a 15-digit reference number (not a card)", () => {
    expect(scrubCardNumbers("foo 000003183851603 bar")).toBe("foo 000003183851603 bar");
  });

  it("does not touch ordinary text with no digit run", () => {
    expect(scrubCardNumbers("HelloRide")).toBe("HelloRide");
  });
});

describe("parseBankStatement — DBS (Singapore) export", () => {
  it("parses a POS row, deriving a clean merchant label from Supplementary Code Description", () => {
    const csv = dbsCsv([
      '"30 Sep 2026","","POS","BAT FakeRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000000000000001","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000001","Settled","SGD",1,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.error).toBeNull();
    expect(result.rows).toEqual([
      {
        date: "2026-09-30",
        label: "FakeRide",
        amount: 1,
        type: "expense",
        currency: "SGD",
        externalRef: "dbs:000000000000001",
      },
    ]);
  });

  it("strips a unit-number-style merchant suffix without touching it (TIMBRE+-shaped label)", () => {
    const csv = dbsCsv([
      '"24 Sep 2026","","POS","BAT FAKE+ #01-29 Singapore SGP 22SEP 1234-5678-9012-3456 000000000000011","BAT FAKE+ #01-29 Singapore SGP  22SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000011","Settled","SGD",6.3,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows[0]?.label).toBe("FAKE+ #01-29");
  });

  it("drops a standalone reference number embedded in the merchant text (APPLE.COM/BILL-shaped label)", () => {
    const csv = dbsCsv([
      '"14 Sep 2026","","POS","BAT FAKE.COM/BILL 8005551234 IRL 12SEP 1234-5678-9012-3456 000000000000010","BAT FAKE.COM/BILL 8005551234 IRL 12SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000010","Settled","SGD",9.99,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows[0]?.label).toBe("FAKE.COM/BILL");
  });

  it("falls back to Client Reference when the merchant label is empty (credit line with no merchant)", () => {
    const csv = dbsCsv([
      '"13 Sep 2026","","POS","BAT  1234-5678-9012-3456 000000000000009","BAT ","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000009","Settled","SGD","",50',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toEqual([
      {
        date: "2026-09-13",
        label: "Point-of-Sale Transaction",
        amount: 50,
        type: "income",
        currency: "SGD",
        externalRef: "dbs:000000000000009",
      },
    ]);
  });

  it("extracts the beneficiary from an outgoing PayNow (ADV) row", () => {
    const csv = dbsCsv([
      '"29 Sep 2026","","ADV","ICT PayNow Transfer 111 To: FAKE MERCHANT PTE. LTD. OTHR FAKEREF111","ICT PayNow Transfer 111","Advice","To: FAKE MERCHANT PTE. LTD.","OTHR FAKEREF111","Settled","SGD",20,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toEqual([
      {
        date: "2026-09-29",
        label: "FAKE MERCHANT PTE. LTD.",
        amount: 20,
        type: "expense",
        currency: "SGD",
        externalRef: "dbs:OTHR FAKEREF111",
      },
    ]);
  });

  it("extracts the payer from an incoming PayNow (ADV) row, with a null external_ref (generic, non-unique Additional Reference)", () => {
    const csv = dbsCsv([
      '"27 Sep 2026","","ADV","ICT Incoming PayNow Ref 222 From: FAKE PERSON OTHR Transfer - Mobile","ICT Incoming PayNow Ref 222","Advice","From: FAKE PERSON","OTHR Transfer - Mobile","Settled","SGD","",50',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows[0]).toMatchObject({ label: "FAKE PERSON", type: "income", amount: 50, externalRef: null });
  });

  it("two distinct incoming PayNow transfers from the same sender both carry the generic 'OTHR Transfer - Mobile' Additional Reference — both must be kept, never collapsed into one", () => {
    const csv = dbsCsv([
      '"27 Sep 2026","","ADV","ICT Incoming PayNow Ref 222 From: FAKE PERSON OTHR Transfer - Mobile","ICT Incoming PayNow Ref 222","Advice","From: FAKE PERSON","OTHR Transfer - Mobile","Settled","SGD","",61',
      '"27 Sep 2026","","ADV","ICT Incoming PayNow Ref 333 From: FAKE PERSON OTHR Transfer - Mobile","ICT Incoming PayNow Ref 333","Advice","From: FAKE PERSON","OTHR Transfer - Mobile","Settled","SGD","",16.5',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.amount)).toEqual([61, 16.5]);
    expect(result.rows.every((r) => r.externalRef === null)).toBe(true);
  });

  it("extracts the merchant from a NETS QR row, and its external_ref from Supplementary Code", () => {
    const csv = dbsCsv([
      '"13 Sep 2026","","ADV","POS NETS QR PAYMENT 999999999999991 TO: FAKE STALL ","POS NETS QR PAYMENT 999999999999991","Advice","TO: FAKE STALL","","Settled","SGD",3,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toEqual([
      {
        date: "2026-09-13",
        label: "FAKE STALL",
        amount: 3,
        type: "expense",
        currency: "SGD",
        externalRef: "dbs:999999999999991",
      },
    ]);
  });

  it("falls back to a generic label and a null external_ref for a bank transfer (TRF) row — unprovable reference uniqueness", () => {
    const csv = dbsCsv([
      '"05 Sep 2026","","ADV","TRF FT000001MB000002 037-00000-0:IB ","TRF FT000001MB000002","Advice","037-00000-0:IB","","Settled","SGD",500,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toEqual([
      { date: "2026-09-05", label: "Virement bancaire", amount: 500, type: "expense", currency: "SGD", externalRef: null },
    ]);
  });

  it("keeps only Status = Settled rows", () => {
    const csv = dbsCsv([
      '"30 Sep 2026","","POS","BAT FakeRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000000000000001","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000001","Settled","SGD",1,""',
      '"20 Sep 2026","","POS","BAT PendingRide SINGAPORE SGP 18SEP 1234-5678-9012-3456 000000000000099","BAT PendingRide SINGAPORE SGP 18SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000099","Processing","SGD",5,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.label).toBe("FakeRide");
    expect(result.skippedCount).toBe(1);
  });

  it("3 legitimate same-day same-amount rows (distinct Additional Reference) are all kept, never merged", () => {
    const csv = dbsCsv([
      '"30 Sep 2026","","POS","BAT FakeRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000000000000001","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000001","Settled","SGD",1,""',
      '"30 Sep 2026","","POS","BAT FakeRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000000000000002","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000002","Settled","SGD",1,""',
      '"30 Sep 2026","","POS","BAT FakeRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000000000000003","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000003","Settled","SGD",1,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.externalRef)).toEqual([
      "dbs:000000000000001",
      "dbs:000000000000002",
      "dbs:000000000000003",
    ]);
  });

  it("dedupes an identical external_ref repeated within the same file, keeping only the first occurrence", () => {
    const row =
      '"30 Sep 2026","","POS","BAT FakeRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000000000000001","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000001","Settled","SGD",1,""';
    const result = parseBankStatement(dbsCsv([row, row]), "SGD");
    expect(result.rows).toHaveLength(1);
    expect(result.skippedCount).toBe(1);
  });

  it("never lets a card number survive into the parsed label, across every row shape", () => {
    const fakeCard = "1234-5678-9012-3456";
    const csv = dbsCsv([
      `"30 Sep 2026","","POS","BAT FakeRide SINGAPORE SGP 28SEP ${fakeCard} 000000000000001","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","${fakeCard}","000000000000001","Settled","SGD",1,""`,
      `"13 Sep 2026","","POS","BAT  ${fakeCard} 000000000000009","BAT ","Point-of-Sale Transaction","${fakeCard}","000000000000009","Settled","SGD","",50`,
      `"29 Sep 2026","","ADV","ICT PayNow Transfer 111 To: FAKE ${fakeCard} PTE. LTD. OTHR FAKEREF111","ICT PayNow Transfer 111","Advice","To: FAKE ${fakeCard} PTE. LTD.","OTHR FAKEREF111","Settled","SGD",20,""`,
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row.label).not.toContain(fakeCard);
      expect(row.label).not.toMatch(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/);
    }
  });

  it("skips a row with an unparsable date", () => {
    const csv = dbsCsv([
      '"not a date","","POS","BAT FakeRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000000000000001","BAT FakeRide SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","000000000000001","Settled","SGD",1,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("skips a row where both the merchant and its fallback are empty", () => {
    const csv = dbsCsv([
      '"30 Sep 2026","","POS","BAT  1234-5678-9012-3456 000000000000001","BAT ","","1234-5678-9012-3456","000000000000001","Settled","SGD",1,""',
    ]);
    const result = parseBankStatement(csv, "SGD");
    expect(result.rows).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("falls through to the generic parser for a non-DBS file", () => {
    const csv = "Date,Description,Amount\n2026-08-01,Groceries,-45.90";
    const result = parseBankStatement(csv, "EUR");
    expect(result.error).toBeNull();
    expect(result.rows[0]?.label).toBe("Groceries");
  });
});
