"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@fintrack/core";
import type { Currency } from "@fintrack/core";
import { currencyMeta } from "../../lib/currencies";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";

export function CurrencyCombobox({
  value,
  onChange,
  id,
}: {
  value: Currency;
  onChange: (value: Currency) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = currencyMeta(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Devise"
          className="w-full justify-between px-3 font-normal"
        >
          <span className="flex items-center gap-1.5 truncate">
            <span aria-hidden>{selected.flag}</span>
            {value}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une devise…" />
          <CommandList>
            <CommandEmpty>Aucune devise.</CommandEmpty>
            <CommandGroup>
              {SUPPORTED_CURRENCIES.map((code) => {
                const meta = currencyMeta(code);
                return (
                  <CommandItem
                    key={code}
                    value={code}
                    keywords={[meta.name]}
                    onSelect={() => {
                      onChange(code);
                      setOpen(false);
                    }}
                  >
                    <span aria-hidden>{meta.flag}</span>
                    <span className="font-medium">{code}</span>
                    <span className="truncate text-muted-foreground">{meta.name}</span>
                    <Check
                      className={cn("ml-auto size-4", code === value ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
