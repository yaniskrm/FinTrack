/**
 * Minimal RFC 4180 CSV reader — quoted fields (embedded delimiters/newlines,
 * `""` as an escaped quote), CRLF or LF line endings. Delimiter is
 * auto-detected between `,` and `;` (French bank exports commonly use `;`;
 * Revolut's own export uses `,`) by counting occurrences in the header line.
 */
export function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(text: string, delimiter?: "," | ";"): string[][] {
  const normalized = text.replace(/^\uFEFF/, ""); // strip a UTF-8 BOM if present
  const sep = delimiter ?? detectDelimiter(normalized.slice(0, normalized.indexOf("\n") + 1 || undefined));

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i] ?? "";
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === sep) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // swallow — the paired \n (or end of input) ends the row
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  // Last field/row, if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
