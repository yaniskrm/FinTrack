"use client";

import { useState } from "react";
import { buildDataExport } from "@fintrack/core";
import type { DataExport } from "@fintrack/core";
import { fetchFullExportData } from "../../lib/export/queries";
import { downloadBlob } from "../../lib/export/download";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

export function JsonExportCard() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setIsPending(true);
    try {
      const data = await fetchFullExportData();
      // DB row `currency: string` is wider than core's `Currency` union — same
      // documented boundary cast as lib/dashboard.ts.
      const payload = buildDataExport(data as unknown as Omit<DataExport, "exportedAt">);
      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `fintrack-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'export.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sauvegarde complète (JSON)</CardTitle>
        <CardDescription>
          Toutes vos données — transactions, récurrences, budgets, objectifs, investissements.
          Pour migration ou archivage (droit à la portabilité RGPD).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void handleExport();
          }}
          disabled={isPending}
        >
          {isPending ? "Génération…" : "Télécharger le JSON"}
        </Button>
      </CardContent>
    </Card>
  );
}
