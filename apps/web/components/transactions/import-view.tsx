"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import {
  findLikelyDuplicates,
  formatCurrency,
  parseBankStatement,
  suggestCategoryId,
} from "@fintrack/core";
import type { Currency, ImportRowInput, ParsedStatementRow, Transaction } from "@fintrack/core";
import { useImportTransactions } from "../../hooks/use-import";
import type { AccountRow } from "../../lib/accounts/types";
import type { CategoryRow, TransactionRow } from "../../lib/transactions/types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

const NO_CATEGORY = "none";

interface ReviewRow extends ParsedStatementRow {
  include: boolean;
  categoryId: string | null;
  isDuplicate: boolean;
}

export function ImportView({
  accounts,
  categories,
  transactions,
}: {
  accounts: AccountRow[];
  categories: CategoryRow[];
  /** All transactions — filtered per selected account for duplicate detection. */
  transactions: TransactionRow[];
}) {
  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
  const visibleCategories = useMemo(() => categories.filter((c) => !c.hidden), [categories]);

  const [accountId, setAccountId] = useState<string>(activeAccounts[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null);

  const importTransactions = useImportTransactions();
  const selectedAccount = activeAccounts.find((a) => a.id === accountId);

  async function handleFile(file: File) {
    setFileName(file.name);
    setParseError(null);
    setReviewRows(null);

    const text = await file.text();
    const defaultCurrency: Currency = (selectedAccount?.currency as Currency | undefined) ?? "EUR";
    const result = parseBankStatement(text, defaultCurrency);

    if (result.error) {
      setParseError(result.error);
      return;
    }

    const accountTransactions = transactions.filter((t) => t.account_id === accountId);
    const duplicateFlags = findLikelyDuplicates(
      result.rows,
      accountTransactions as unknown as Transaction[],
    );
    const history = transactions.map((t) => ({ label: t.label, merchant: t.merchant, category_id: t.category_id }));

    setSkippedCount(result.skippedCount);
    setReviewRows(
      result.rows.map((row, i) => ({
        ...row,
        include: !duplicateFlags[i],
        categoryId: suggestCategoryId({ label: row.label, merchant: null }, categories, history),
        isDuplicate: duplicateFlags[i] ?? false,
      })),
    );
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setReviewRows((rows) => rows?.map((r, i) => (i === index ? { ...r, ...patch } : r)) ?? null);
  }

  const includedCount = reviewRows?.filter((r) => r.include).length ?? 0;

  function handleImport() {
    if (!reviewRows) return;
    const rows: ImportRowInput[] = reviewRows
      .filter((r) => r.include)
      .map((r) => ({
        date: r.date,
        label: r.label,
        amount: r.amount,
        type: r.type,
        currency: r.currency,
        categoryId: r.categoryId,
      }));
    importTransactions.mutate(
      { accountId, rows },
      {
        onSuccess: () => {
          setReviewRows(null);
          setFileName(null);
        },
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Retour">
          <Link href="/transactions">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importer un relevé</h1>
          <p className="text-sm text-muted-foreground">
            CSV exporté depuis votre banque — détection automatique des colonnes, des doublons et des
            catégories.
          </p>
        </div>
      </div>

      <Card className="gap-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="import-account">Compte de destination</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger id="import-account">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-file">Fichier CSV</Label>
          <input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
        </div>
      </Card>

      {reviewRows && (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {reviewRows.length} ligne{reviewRows.length > 1 ? "s" : ""} détectée
              {reviewRows.length > 1 ? "s" : ""}
              {skippedCount > 0
                ? ` · ${String(skippedCount)} ignorée${skippedCount > 1 ? "s" : ""} (en attente/annulée)`
                : ""}
              {" · "}
              {includedCount} sélectionnée{includedCount > 1 ? "s" : ""}
            </p>
            <Button onClick={handleImport} disabled={includedCount === 0 || importTransactions.isPending}>
              <Upload className="size-4" />
              {importTransactions.isPending ? "Import…" : `Importer ${String(includedCount)}`}
            </Button>
          </div>

          <Card className="gap-0 divide-y py-0">
            {reviewRows.map((row, i) => (
              <div key={`${row.date}-${row.label}-${String(i)}`} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-primary"
                  checked={row.include}
                  aria-label={`Inclure ${row.label}`}
                  onChange={(e) => {
                    updateRow(i, { include: e.target.checked });
                  }}
                />

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {row.label}
                    {row.isDuplicate && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-normal"
                        style={{ backgroundColor: "var(--chart-3)", color: "var(--primary-foreground)" }}
                      >
                        doublon probable
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.date}</p>
                </div>

                <Select
                  value={row.categoryId ?? NO_CATEGORY}
                  onValueChange={(v) => {
                    updateRow(i, { categoryId: v === NO_CATEGORY ? null : v });
                  }}
                >
                  <SelectTrigger className="w-[150px]" aria-label={`Catégorie de ${row.label}`}>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Aucune</SelectItem>
                    {visibleCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p
                  className={cn(
                    "w-24 shrink-0 text-right text-sm font-semibold tabular-nums",
                    row.type === "income" ? "text-success" : "text-foreground",
                  )}
                >
                  {row.type === "income" ? "+" : "-"}
                  {formatCurrency(row.amount, row.currency)}
                </p>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
