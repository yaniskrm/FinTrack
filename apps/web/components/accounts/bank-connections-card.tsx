"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Landmark, Plug, RefreshCw, Unplug } from "lucide-react";
import {
  useBankConnections,
  useCreateAccountFromConnection,
  useDisconnectBankConnection,
  useLinkBankConnection,
  useReconnectBankConnection,
  useSyncBankConnection,
} from "../../hooks/use-banking";
import type { BankConnectionRow } from "../../lib/banking/types";
import type { AccountRow } from "../../lib/accounts/types";
import { countryMeta } from "../../lib/countries";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ConnectBankDialog } from "./connect-bank-dialog";

const STATUS_LABELS: Record<BankConnectionRow["status"], string> = {
  pending: "En attente",
  active: "Active",
  expired: "Expirée",
  revoked: "Déconnectée",
};

function maskIban(iban: string | null): string {
  if (!iban) return "";
  return `•••• ${iban.slice(-4)}`;
}

function LinkOrCreateRow({ connection, accounts }: { connection: BankConnectionRow; accounts: AccountRow[] }) {
  const [accountId, setAccountId] = useState<string>("");
  const [newAccountName, setNewAccountName] = useState("");
  const link = useLinkBankConnection();
  const createAndLink = useCreateAccountFromConnection();

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <Select value={accountId} onValueChange={setAccountId}>
        <SelectTrigger className="w-[180px]" aria-label="Lier à un compte existant">
          <SelectValue placeholder="Lier à un compte…" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.icon} {acc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="secondary"
        disabled={!accountId || link.isPending}
        onClick={() => {
          link.mutate({ connectionId: connection.id, accountId });
        }}
      >
        Lier
      </Button>

      <span className="text-xs text-muted-foreground">ou</span>

      <Input
        placeholder="Nom du nouveau compte"
        className="w-[160px]"
        value={newAccountName}
        onChange={(e) => {
          setNewAccountName(e.target.value);
        }}
        aria-label="Nom du nouveau compte"
      />
      <Button
        size="sm"
        variant="secondary"
        disabled={!newAccountName.trim() || createAndLink.isPending}
        onClick={() => {
          createAndLink.mutate({ connectionId: connection.id, name: newAccountName.trim() });
        }}
      >
        Créer
      </Button>
    </div>
  );
}

export function BankConnectionsCard({
  initialConnections,
  accounts,
}: {
  initialConnections: BankConnectionRow[];
  accounts: AccountRow[];
}) {
  const { data: connections } = useBankConnections(initialConnections);
  const sync = useSyncBankConnection();
  const reconnect = useReconnectBankConnection();
  const disconnect = useDisconnectBankConnection();
  const [dialogOpen, setDialogOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const bankingStatus = searchParams.get("banking");

  useEffect(() => {
    if (bankingStatus === "success") {
      toast.success("Banque connectée — reliez-la à un compte ci-dessous.");
    } else if (bankingStatus === "error") {
      toast.error("La connexion à la banque a échoué.");
    }
    if (bankingStatus) {
      router.replace("/settings/accounts");
    }
    // Deliberately depends only on [bankingStatus] — router is stable
    // across renders in the App Router, and re-running on every navigation
    // rather than only when the query param changes would loop.
  }, [bankingStatus]);

  const activeAccounts = accounts.filter((a) => a.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Open Banking</h2>
          <p className="text-sm text-muted-foreground">
            Synchronisation automatique des transactions via Enable Banking.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          <Plug className="size-4" />
          Connecter ma banque
        </Button>
      </div>

      {connections.length > 0 && (
        <Card className="gap-0 divide-y py-0">
          {connections.map((connection) => {
            const account = accounts.find((a) => a.id === connection.account_id);
            return (
              <div key={connection.id} className="space-y-1 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-base"
                    aria-hidden
                  >
                    <Landmark className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {countryMeta(connection.aspsp_country).flag} {connection.aspsp_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {maskIban(connection.iban)}
                      {account ? ` · lié à ${account.name}` : ""}
                      {" · "}
                      {STATUS_LABELS[connection.status]}
                    </p>
                  </div>

                  {connection.status === "active" && connection.account_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={sync.isPending}
                      onClick={() => {
                        sync.mutate(connection.id);
                      }}
                    >
                      <RefreshCw className="size-4" />
                      Synchroniser
                    </Button>
                  )}

                  {(connection.status === "expired" || connection.status === "revoked") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={reconnect.isPending}
                      onClick={() => {
                        reconnect.mutate(connection.id);
                      }}
                    >
                      Reconnecter
                    </Button>
                  )}

                  {connection.status !== "revoked" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Déconnecter"
                      disabled={disconnect.isPending}
                      onClick={() => {
                        disconnect.mutate(connection.id);
                      }}
                    >
                      <Unplug className="size-4" />
                    </Button>
                  )}
                </div>

                {connection.status === "active" && !connection.account_id && (
                  <LinkOrCreateRow connection={connection} accounts={activeAccounts} />
                )}
              </div>
            );
          })}
        </Card>
      )}

      <ConnectBankDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
