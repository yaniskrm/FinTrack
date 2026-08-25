"use client";

import { useState, useTransition } from "react";
import type { Currency } from "@fintrack/core";
import { updateDefaultCurrencyAction } from "../../../../lib/profile/actions";
import { CurrencyCombobox } from "../../../../components/transactions/currency-combobox";
import { Button } from "../../../../components/ui/button";

export function DefaultCurrencyForm({ initialCurrency }: { initialCurrency: Currency }) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [saved, setSaved] = useState<Currency>(initialCurrency);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateDefaultCurrencyAction(currency);
      if (result.ok) {
        setSaved(currency);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <CurrencyCombobox value={currency} onChange={setCurrency} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" onClick={handleSave} disabled={isPending || currency === saved}>
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}
