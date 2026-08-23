"use client";

import { useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { LineChart, Pencil, Plus, TrendingDown, TrendingUp, Trash2, XCircle } from "lucide-react";
import {
  buildPortfolioHistory,
  calculatePortfolioSummary,
  calculatePositionPnL,
  formatCurrency,
  groupInvestmentsByCurrency,
  groupInvestmentsByType,
} from "@fintrack/core";
import type { Currency, Investment, InvestmentFormValues, InvestmentType } from "@fintrack/core";
import { useDeleteInvestment, useInvestments, useInvestmentValuations } from "../../hooks/use-investments";
import type { InvestmentRow, InvestmentValuationRow } from "../../lib/investments/types";
import { currencyMeta } from "../../lib/currencies";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";
import { AllocationDonut } from "./allocation-donut";
import { PerformanceChart } from "./performance-chart";
import { InvestmentDialog } from "./investment-dialog";
import { ValuationDialog } from "./valuation-dialog";
import { ClosePositionDialog } from "./close-position-dialog";

const ASSET_TYPE_LABELS: Record<InvestmentType, string> = {
  etf: "ETF",
  stock: "Action",
  scpi: "SCPI",
  savings: "Livret",
  crypto: "Crypto",
  other: "Autre",
};

interface EditDialogState {
  open: boolean;
  editId?: string;
  initialValues?: DefaultValues<InvestmentFormValues>;
}

interface ActionDialogState {
  kind: "valuation" | "close";
  investment: InvestmentRow;
}

function toFormValues(investment: InvestmentRow): DefaultValues<InvestmentFormValues> {
  return {
    name: investment.name,
    assetType: investment.asset_type,
    ticker: investment.ticker,
    broker: investment.broker,
    quantity: investment.quantity,
    buyPriceEur: investment.buy_price_eur,
    currentPriceEur: investment.current_price_eur,
    currency: investment.currency as Currency,
    openedAt: investment.opened_at,
    notes: investment.notes,
  };
}

function PnlText({ valueEur, percent }: { valueEur: number; percent: number }) {
  const positive = valueEur >= 0;
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-medium tabular-nums", positive ? "text-success" : "text-destructive")}
    >
      {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {positive ? "+" : ""}
      {formatCurrency(valueEur, "EUR")} ({positive ? "+" : ""}
      {percent.toFixed(1)}%)
    </span>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="gap-2 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export function InvestmentsView({
  initialInvestments,
  initialValuations,
}: {
  initialInvestments: InvestmentRow[];
  initialValuations: InvestmentValuationRow[];
}) {
  const { data: investments } = useInvestments(initialInvestments);
  const { data: valuations } = useInvestmentValuations(initialValuations);
  const deleteInvestment = useDeleteInvestment();

  const [dialog, setDialog] = useState<EditDialogState>({ open: false });
  const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // DB row `currency: string` is wider than core's `Currency` union — same
  // documented boundary cast as lib/dashboard.ts.
  const items = investments as unknown as Investment[];
  const summary = calculatePortfolioSummary(items);
  const byType = groupInvestmentsByType(items);
  const byCurrency = groupInvestmentsByCurrency(items);
  const history = buildPortfolioHistory(items, valuations);

  const openPositions = items.filter((i) => i.closed_at === null);
  const closedPositions = items.filter((i) => i.closed_at !== null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investissements</h1>
          <p className="text-sm text-muted-foreground">Portefeuille, allocation et performance.</p>
        </div>
        <Button
          onClick={() => {
            setDialog({ open: true });
          }}
        >
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      {investments.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune position pour le moment.</p>
          <Button
            variant="outline"
            onClick={() => {
              setDialog({ open: true });
            }}
          >
            <Plus className="size-4" />
            Ajouter la première position
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Valeur du portefeuille" value={formatCurrency(summary.totalCurrentValueEur, "EUR")} />
            <SummaryTile
              label="Plus/moins-value latente"
              value={`${summary.totalUnrealizedPnlEur >= 0 ? "+" : ""}${formatCurrency(summary.totalUnrealizedPnlEur, "EUR")}`}
              sub={`${summary.totalUnrealizedPnlPercent >= 0 ? "+" : ""}${summary.totalUnrealizedPnlPercent.toFixed(1)}%`}
            />
            <SummaryTile
              label="Plus/moins-value réalisée"
              value={`${summary.totalRealizedPnlEur >= 0 ? "+" : ""}${formatCurrency(summary.totalRealizedPnlEur, "EUR")}`}
              sub={`${String(summary.closedPositionsCount)} position(s) clôturée(s)`}
            />
            <SummaryTile
              label="Performance globale"
              value={`${summary.overallPerformancePercent >= 0 ? "+" : ""}${summary.overallPerformancePercent.toFixed(1)}%`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="gap-3 p-5">
              <p className="text-sm font-medium">Répartition par classe d&apos;actifs</p>
              <AllocationDonut slices={byType} labelOf={(k) => ASSET_TYPE_LABELS[k]} />
            </Card>
            <Card className="gap-3 p-5">
              <p className="text-sm font-medium">Répartition par devise</p>
              <AllocationDonut slices={byCurrency} labelOf={(k) => `${k} · ${currencyMeta(k as Currency).name}`} />
            </Card>
          </div>

          <Card className="gap-3 p-5">
            <p className="text-sm font-medium">Performance du portefeuille</p>
            <PerformanceChart data={history} />
          </Card>

          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Positions ouvertes</h2>
            <Card className="gap-0 divide-y py-0">
              {openPositions.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune position ouverte.</p>
              ) : (
                openPositions.map((investment) => {
                  const pnl = calculatePositionPnL(investment);
                  return (
                    <div key={investment.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {investment.name}
                            {investment.ticker && (
                              <span className="ml-1.5 text-xs text-muted-foreground">{investment.ticker}</span>
                            )}
                          </p>
                          <p className="shrink-0 text-sm font-medium tabular-nums">
                            {formatCurrency(pnl.currentValueEur, "EUR")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{ASSET_TYPE_LABELS[investment.asset_type]}</span>
                          {investment.broker && <span>· {investment.broker}</span>}
                          <span>
                            · {investment.quantity} × {formatCurrency(investment.current_price_eur, "EUR")}
                          </span>
                          <span>·</span>
                          <PnlText valueEur={pnl.unrealizedPnlEur} percent={pnl.unrealizedPnlPercent} />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        {confirmingDeleteId === investment.id ? (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteInvestment.isPending}
                              onClick={() => {
                                deleteInvestment.mutate(investment.id);
                                setConfirmingDeleteId(null);
                              }}
                            >
                              Supprimer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setConfirmingDeleteId(null);
                              }}
                            >
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Nouvelle valorisation"
                              onClick={() => {
                                setActionDialog({ kind: "valuation", investment });
                              }}
                            >
                              <LineChart className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Clôturer la position"
                              onClick={() => {
                                setActionDialog({ kind: "close", investment });
                              }}
                            >
                              <XCircle className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Modifier"
                              onClick={() => {
                                setDialog({ open: true, editId: investment.id, initialValues: toFormValues(investment) });
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Supprimer"
                              onClick={() => {
                                setConfirmingDeleteId(investment.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </div>

          {closedPositions.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Positions clôturées</h2>
              <Card className="gap-0 divide-y py-0">
                {closedPositions.map((investment) => {
                  const pnl = calculatePositionPnL(investment);
                  return (
                    <div key={investment.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-muted-foreground">{investment.name}</p>
                          <PnlText valueEur={pnl.realizedPnlEur} percent={pnl.realizedPnlPercent} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ASSET_TYPE_LABELS[investment.asset_type]} · vendu le{" "}
                          {investment.closed_at &&
                            new Date(`${investment.closed_at}T00:00:00`).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => {
                          deleteInvestment.mutate(investment.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}
        </>
      )}

      <InvestmentDialog
        open={dialog.open}
        onOpenChange={(open) => {
          setDialog((prev) => ({ ...prev, open }));
        }}
        editId={dialog.editId}
        initialValues={dialog.initialValues}
      />

      {actionDialog?.kind === "valuation" && (
        <ValuationDialog
          open
          onOpenChange={(open) => {
            if (!open) setActionDialog(null);
          }}
          investmentId={actionDialog.investment.id}
          investmentName={actionDialog.investment.name}
          currentPriceEur={actionDialog.investment.current_price_eur}
        />
      )}

      {actionDialog?.kind === "close" && (
        <ClosePositionDialog
          open
          onOpenChange={(open) => {
            if (!open) setActionDialog(null);
          }}
          investmentId={actionDialog.investment.id}
          investmentName={actionDialog.investment.name}
          currentPriceEur={actionDialog.investment.current_price_eur}
        />
      )}
    </div>
  );
}
