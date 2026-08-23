"use client";

import { useState } from "react";
import { fetchMonthlyReportData } from "../../lib/export/queries";
import { buildMonthlyReportPdf } from "../../lib/export/pdf";
import { downloadBlob } from "../../lib/export/download";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function PdfExportCard() {
  const [month, setMonth] = useState(currentMonth());
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setIsPending(true);
    try {
      const { transactions, categories, budgets } = await fetchMonthlyReportData(month);
      const pdf = buildMonthlyReportPdf(month, transactions, categories, budgets);
      downloadBlob(pdf, `fintrack-rapport-${month}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la génération du PDF.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapport mensuel (PDF)</CardTitle>
        <CardDescription>Résumé, répartition par catégorie, budgets et détail des transactions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pdfMonth">Mois</Label>
          <Input
            id="pdfMonth"
            type="month"
            className="w-48"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
            }}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          onClick={() => {
            void handleExport();
          }}
          disabled={isPending}
        >
          {isPending ? "Génération…" : "Télécharger le PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
