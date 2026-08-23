"use client";

import { useState } from "react";
import { transactionsToCsv } from "@fintrack/core";
import type { Transaction } from "@fintrack/core";
import { fetchTransactionsForExport } from "../../lib/export/queries";
import { downloadBlob } from "../../lib/export/download";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

function firstOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CsvExportCard() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setIsPending(true);
    try {
      const { transactions, categories } = await fetchTransactionsForExport(from, to);
      // DB row `currency: string` is wider than core's `Currency` union — same
      // documented boundary cast as lib/dashboard.ts.
      const csv = transactionsToCsv(transactions as unknown as Transaction[], categories);
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `fintrack-transactions-${from}-au-${to}.csv`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'export.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions (CSV)</CardTitle>
        <CardDescription>Toutes les transactions sur une période donnée.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="csvFrom">Du</Label>
            <Input
              id="csvFrom"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csvTo">Au</Label>
            <Input
              id="csvTo"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
              }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          onClick={() => {
            void handleExport();
          }}
          disabled={isPending}
        >
          {isPending ? "Génération…" : "Télécharger le CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}
