import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv } from "./parse-csv.js";

describe("detectDelimiter", () => {
  it("picks comma when commas dominate", () => {
    expect(detectDelimiter("Date,Label,Amount")).toBe(",");
  });

  it("picks semicolon when semicolons dominate", () => {
    expect(detectDelimiter("Date;Label;Amount")).toBe(";");
  });
});

describe("parseCsv", () => {
  it("parses a simple comma-delimited file", () => {
    const text = "Date,Label,Amount\n2026-08-01,Courses,-12.50\n2026-08-02,Salaire,2000.00";
    expect(parseCsv(text)).toEqual([
      ["Date", "Label", "Amount"],
      ["2026-08-01", "Courses", "-12.50"],
      ["2026-08-02", "Salaire", "2000.00"],
    ]);
  });

  it("parses a semicolon-delimited file", () => {
    const text = "Date;Label;Montant\n2026-08-01;Courses;-12,50";
    expect(parseCsv(text)).toEqual([
      ["Date", "Label", "Montant"],
      ["2026-08-01", "Courses", "-12,50"],
    ]);
  });

  it("handles quoted fields containing the delimiter", () => {
    const text = 'Date,Label,Amount\n2026-08-01,"Restaurant, le bistrot",-30.00';
    expect(parseCsv(text)).toEqual([
      ["Date", "Label", "Amount"],
      ["2026-08-01", "Restaurant, le bistrot", "-30.00"],
    ]);
  });

  it("handles an escaped quote inside a quoted field", () => {
    const text = 'Date,Label\n2026-08-01,"L\'\'hôtel ""Le Grand"""';
    const rows = parseCsv(text);
    expect(rows[1]?.[1]).toBe('L\'\'hôtel "Le Grand"');
  });

  it("handles CRLF line endings", () => {
    const text = "Date,Label\r\n2026-08-01,Courses\r\n2026-08-02,Loyer";
    expect(parseCsv(text)).toEqual([
      ["Date", "Label"],
      ["2026-08-01", "Courses"],
      ["2026-08-02", "Loyer"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    const text = "﻿Date,Label\n2026-08-01,Courses";
    expect(parseCsv(text)[0]).toEqual(["Date", "Label"]);
  });

  it("handles a file with no trailing newline", () => {
    const text = "Date,Label\n2026-08-01,Courses";
    expect(parseCsv(text)).toEqual([
      ["Date", "Label"],
      ["2026-08-01", "Courses"],
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
