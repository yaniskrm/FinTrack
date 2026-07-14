import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ExchangeRate } from "@fintrack/core";

export function useExchangeRates() {
  return useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("currency, rate_to_eur, updated_at");
      if (error) throw error;
      return data as ExchangeRate[];
    },
    staleTime: 1000 * 60 * 60, // 1h — matches Edge Function cron
  });
}

/** Returns the EUR rate for a given currency, defaulting to 1 (EUR) if not found. */
export function useRateToEur(currency: string): number {
  const { data: rates } = useExchangeRates();
  if (!rates || currency === "EUR") return 1;
  return rates.find((r) => r.currency === currency)?.rate_to_eur ?? 1;
}
