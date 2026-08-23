import type { Metadata } from "next";
import { CsvExportCard } from "../../../../components/settings/csv-export-card";
import { JsonExportCard } from "../../../../components/settings/json-export-card";
import { PdfExportCard } from "../../../../components/settings/pdf-export-card";

export const metadata: Metadata = {
  title: "Export — FinTrack",
};

export default function ExportSettingsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Export</h1>
        <p className="text-sm text-muted-foreground">
          Téléchargez vos données. Rien ne transite par un serveur tiers : les fichiers sont
          générés directement dans votre navigateur.
        </p>
      </div>

      <CsvExportCard />
      <PdfExportCard />
      <JsonExportCard />
    </>
  );
}
