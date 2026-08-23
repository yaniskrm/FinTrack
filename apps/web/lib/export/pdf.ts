import { jsPDF } from "jspdf";
import { calculateBudgetStatuses, calculateTotals, formatCurrency, groupExpensesByCategory } from "@fintrack/core";
import type { Transaction } from "@fintrack/core";
import type { BudgetRow } from "../budgets/types";
import type { CategoryRow, TransactionRow } from "../transactions/types";

const GOLD = "#C9A961";
const CHARCOAL = "#2B2620";
const MUTED = "#6B6459";

function monthLabel(yearMonth: string): string {
  return new Date(`${yearMonth}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/**
 * Client-side monthly report — text/tables plus a simple bar chart drawn with
 * jsPDF primitives (no chart-library/canvas round-trip needed). Returns the
 * PDF as a Blob for the caller to trigger a download with.
 */
export function buildMonthlyReportPdf(
  yearMonth: string,
  transactionRows: TransactionRow[],
  categories: CategoryRow[],
  budgetRows: BudgetRow[],
): Blob {
  // Core calcs only read amount_eur/type/date/category_id — the DB row's
  // wider `currency: string` is irrelevant here (see lib/dashboard.ts).
  const transactions = transactionRows as unknown as Transaction[];
  const totals = calculateTotals(transactions);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const expenseGroups = groupExpensesByCategory(transactions).slice(0, 8);
  const budgetStatuses = calculateBudgetStatuses(budgetRows, transactions);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  doc.setFillColor(GOLD);
  doc.rect(0, 0, pageWidth, 8, "F");

  doc.setTextColor(CHARCOAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FinTrack — Rapport mensuel", margin, (y += 36));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(MUTED);
  doc.text(monthLabel(yearMonth), margin, (y += 20));

  // ─── Summary ──────────────────────────────────────────────
  y += 30;
  const summaryCols: [string, string][] = [
    ["Revenus", formatCurrency(totals.totalIncome, "EUR")],
    ["Dépenses", formatCurrency(totals.totalExpenses, "EUR")],
    ["Solde net", formatCurrency(totals.netBalance, "EUR")],
  ];
  const colWidth = (pageWidth - margin * 2) / 3;
  summaryCols.forEach(([label, value], i) => {
    const x = margin + i * colWidth;
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text(label, x, y);
    doc.setFontSize(16);
    doc.setTextColor(CHARCOAL);
    doc.setFont("helvetica", "bold");
    doc.text(value, x, y + 20);
    doc.setFont("helvetica", "normal");
  });

  // ─── Category bar chart ──────────────────────────────────
  y += 56;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(CHARCOAL);
  doc.text("Dépenses par catégorie", margin, y);
  y += 16;

  const maxValue = Math.max(1, ...expenseGroups.map((g) => g.total));
  const barAreaWidth = pageWidth - margin * 2 - 140;
  const barHeight = 14;
  const barGap = 8;

  if (expenseGroups.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text("Aucune dépense ce mois-ci.", margin, y + 12);
    y += 24;
  } else {
    for (const group of expenseGroups) {
      const name = group.categoryId ? (categoryById.get(group.categoryId)?.name ?? "Sans catégorie") : "Sans catégorie";
      const barWidth = (group.total / maxValue) * barAreaWidth;

      doc.setFontSize(9);
      doc.setTextColor(CHARCOAL);
      doc.text(name, margin, y + barHeight - 4, { maxWidth: 120 });

      doc.setFillColor(GOLD);
      doc.rect(margin + 130, y, Math.max(2, barWidth), barHeight, "F");

      doc.setTextColor(MUTED);
      doc.text(formatCurrency(group.total, "EUR"), margin + 130 + Math.max(2, barWidth) + 6, y + barHeight - 4);

      y += barHeight + barGap;
    }
  }

  // ─── Budgets ──────────────────────────────────────────────
  y += 16;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(CHARCOAL);
  doc.text("Budgets", margin, y);
  y += 16;

  if (budgetStatuses.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text("Aucun budget défini.", margin, y + 12);
    y += 24;
  } else {
    doc.setFontSize(9);
    for (const status of budgetStatuses) {
      const category = categoryById.get(status.budget.category_id);
      const label = `${category?.name ?? "Sans catégorie"} — ${formatCurrency(status.spent, "EUR")} / ${formatCurrency(status.budget.amount_eur, "EUR")} (${String(Math.round(status.percentage))}%)`;
      doc.setTextColor(status.isExceeded ? "#C0392B" : status.isWarning ? "#B8860B" : CHARCOAL);
      doc.text(label, margin, y);
      y += 16;
    }
  }

  // ─── Transactions table ──────────────────────────────────
  y += 16;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(CHARCOAL);
  doc.text("Transactions", margin, y);
  y += 14;

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text("Date", margin, y);
  doc.text("Libellé", margin + 60, y);
  doc.text("Catégorie", margin + 260, y);
  doc.text("Montant EUR", pageWidth - margin, y, { align: "right" });
  y += 10;
  doc.setDrawColor(MUTED);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  const pageHeight = doc.internal.pageSize.getHeight();
  for (const tx of transactionRows) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    const category = tx.category_id ? categoryById.get(tx.category_id) : undefined;
    doc.setTextColor(CHARCOAL);
    doc.text(tx.date, margin, y);
    doc.text(tx.label, margin + 60, y, { maxWidth: 190 });
    doc.text(category?.name ?? "—", margin + 260, y, { maxWidth: 130 });
    doc.setTextColor(tx.type === "expense" ? "#C0392B" : "#2E7D32");
    doc.text(formatCurrency(tx.amount_eur, "EUR"), pageWidth - margin, y, { align: "right" });
    y += 14;
  }

  return doc.output("blob");
}
