"use client";

import { useEffect, useState } from "react";
import type { EnableBankingAspsp } from "@fintrack/core";
import { useListAspsps, useStartBankConnection } from "../../hooks/use-banking";
import { ENABLE_BANKING_COUNTRIES, countryMeta } from "../../lib/countries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";

export function ConnectBankDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [country, setCountry] = useState<string>("FR");
  const [aspsps, setAspsps] = useState<EnableBankingAspsp[]>([]);
  const listAspsps = useListAspsps();
  const startConnection = useStartBankConnection();

  useEffect(() => {
    if (!open) return;
    listAspsps.mutate(country, { onSuccess: setAspsps });
    // Deliberately depends only on [open, country] — refetching on every
    // mutation-object identity change would loop forever.
  }, [open, country]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connecter ma banque</DialogTitle>
          <DialogDescription>
            Synchronisation automatique via Enable Banking (Open Banking, PSD2). Vous serez redirigé vers le
            site de votre banque pour donner votre consentement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger aria-label="Pays">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENABLE_BANKING_COUNTRIES.map((code) => {
                const meta = countryMeta(code);
                return (
                  <SelectItem key={code} value={code}>
                    {meta.flag} {meta.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {aspsps.length > 0 ? (
            // Only mounted once there's at least one item — an empty cmdk
            // listbox renders `role="listbox"` with no `option`/`group`
            // children at all (cmdk hides an empty CommandGroup from the
            // DOM), which fails the WCAG "aria-required-children" rule
            // (found by the axe scan added alongside this dialog, same
            // discovery mechanism as ADR-017).
            <Command className="rounded-lg border">
              <CommandInput placeholder="Rechercher une banque…" />
              <CommandList>
                <CommandGroup>
                  {aspsps.map((aspsp) => (
                    <CommandItem
                      key={aspsp.name}
                      value={aspsp.name}
                      disabled={startConnection.isPending}
                      onSelect={() => {
                        startConnection.mutate({ aspspName: aspsp.name, aspspCountry: country });
                      }}
                    >
                      {aspsp.name}
                      {aspsp.sandbox && (
                        <span className="ml-auto shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                          test
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              {listAspsps.isPending ? "Chargement…" : "Aucune banque trouvée pour ce pays."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
