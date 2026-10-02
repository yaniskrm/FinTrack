"use server";

import {
  aspspNameSchema,
  buildBankingRedirectUrl,
  connectionAccountNameSchema,
  countryCodeSchema,
  findDuplicates,
  rowIdSchema,
  suggestCategoryId,
} from "@fintrack/core";
import type { Category, Currency, Transaction } from "@fintrack/core";
import {
  deleteSession,
  getAccountTransactions,
  listAspsps,
  normalizeEnableBankingTransactions,
  startAuthorization,
} from "@fintrack/core/server";
import type { EnableBankingAspsp, EnableBankingTransaction } from "@fintrack/core/server";
import { createClient } from "../supabase/server";
import { importTransactionsAction } from "../transactions/import-actions";
import { getEnableBankingCredentials } from "./credentials";
import type { BankConnectionRow } from "./types";

export type BankingResult<T> = { ok: true; data: T } | { ok: false; error: string };

const INVALID_INPUT = { ok: false, error: "Données invalides." } as const;

// Requested consent length — comfortably under every ASPSP's
// maximum_consent_validity seen in the sandbox (90+ days), and a
// reasonable re-consent cadence for a personal-finance app.
const CONSENT_VALIDITY_DAYS = 90;

// Built from a configured base URL, never from a request's live Origin —
// must match, character for character, the URL whitelisted for this
// application in the Enable Banking Control Panel. Same env var in every
// environment; only its *value* differs (http://localhost:3000 locally
// against a Sandbox application, the real https domain in production
// against a Production application — see CLAUDE.md, Open Banking).
function bankingRedirectUrl(): string {
  return buildBankingRedirectUrl(process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000");
}

async function requireWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function listAspspsForCountryAction(country: string): Promise<BankingResult<EnableBankingAspsp[]>> {
  const parsedCountry = countryCodeSchema.safeParse(country);
  if (!parsedCountry.success) return INVALID_INPUT;

  // A Server Action is a public endpoint and this one spends the app's own
  // Enable Banking credentials — never serve it without a session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session invalide." };

  try {
    const aspsps = await listAspsps(parsedCountry.data, getEnableBankingCredentials());
    return { ok: true, data: aspsps };
  } catch {
    return { ok: false, error: "Impossible de récupérer la liste des banques." };
  }
}

export async function startBankConnectionAction(
  aspspName: string,
  aspspCountry: string,
): Promise<BankingResult<{ url: string }>> {
  const parsedName = aspspNameSchema.safeParse(aspspName);
  const parsedCountry = countryCodeSchema.safeParse(aspspCountry);
  if (!parsedName.success || !parsedCountry.success) return INVALID_INPUT;
  const bank = { name: parsedName.data, country: parsedCountry.data };

  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) return { ok: false, error: "Espace introuvable." };

  const supabase = await createClient();
  const { data: connection, error: insertError } = await supabase
    .from("bank_connections")
    .insert({ workspace_id: workspaceId, aspsp_name: bank.name, aspsp_country: bank.country, status: "pending" })
    .select("state")
    .single();

  if (insertError) {
    return { ok: false, error: "Création de la connexion impossible." };
  }

  const validUntil = new Date(Date.now() + CONSENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = await startAuthorization(
      {
        aspspName: bank.name,
        aspspCountry: bank.country,
        redirectUrl: bankingRedirectUrl(),
        state: connection.state,
        validUntil,
      },
      getEnableBankingCredentials(),
    );
    return { ok: true, data: { url: result.url } };
  } catch {
    await supabase.from("bank_connections").delete().eq("state", connection.state);
    return { ok: false, error: "Connexion à la banque impossible." };
  }
}

export async function reconnectBankConnectionAction(
  connectionId: string,
): Promise<BankingResult<{ url: string }>> {
  if (!rowIdSchema.safeParse(connectionId).success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bank_connections")
    .select("aspsp_name, aspsp_country")
    .eq("id", connectionId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Connexion introuvable." };

  const { data: updated, error } = await supabase
    .from("bank_connections")
    .update({ status: "pending", state: crypto.randomUUID() })
    .eq("id", connectionId)
    .select("state")
    .single();
  if (error) return { ok: false, error: "Mise à jour impossible." };

  const validUntil = new Date(Date.now() + CONSENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = await startAuthorization(
      {
        aspspName: existing.aspsp_name,
        aspspCountry: existing.aspsp_country,
        redirectUrl: bankingRedirectUrl(),
        state: updated.state,
        validUntil,
      },
      getEnableBankingCredentials(),
    );
    return { ok: true, data: { url: result.url } };
  } catch {
    return { ok: false, error: "Connexion à la banque impossible." };
  }
}

export async function linkBankConnectionAction(
  connectionId: string,
  accountId: string,
): Promise<BankingResult<BankConnectionRow>> {
  if (!rowIdSchema.safeParse(connectionId).success || !rowIdSchema.safeParse(accountId).success) {
    return INVALID_INPUT;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .update({ account_id: accountId })
    .eq("id", connectionId)
    .select("*")
    .single();
  if (error) return { ok: false, error: "Liaison impossible." };
  return { ok: true, data };
}

export async function createAccountFromConnectionAction(
  connectionId: string,
  name: string,
): Promise<BankingResult<BankConnectionRow>> {
  const parsedName = connectionAccountNameSchema.safeParse(name);
  if (!rowIdSchema.safeParse(connectionId).success || !parsedName.success) return INVALID_INPUT;

  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) return { ok: false, error: "Espace introuvable." };

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("bank_connections")
    .select("currency")
    .eq("id", connectionId)
    .maybeSingle();
  if (!connection) return { ok: false, error: "Connexion introuvable." };

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({
      workspace_id: workspaceId,
      name: parsedName.data,
      type: "checking",
      currency: connection.currency ?? "EUR",
      initial_balance: 0,
      initial_balance_eur: 0,
      icon: "🏛️",
    })
    .select("id")
    .single();
  if (accountError) return { ok: false, error: "Création du compte impossible." };

  return linkBankConnectionAction(connectionId, account.id);
}

export async function disconnectBankConnectionAction(connectionId: string): Promise<BankingResult<null>> {
  if (!rowIdSchema.safeParse(connectionId).success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("bank_connections")
    .select("session_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (!connection) return { ok: false, error: "Connexion introuvable." };

  if (connection.session_id) {
    try {
      await deleteSession(connection.session_id, getEnableBankingCredentials());
    } catch {
      // Best-effort — revoke locally regardless (mirrors accounts/categories:
      // never hard-deleted, just marked inactive/revoked).
    }
  }

  const { error } = await supabase.from("bank_connections").update({ status: "revoked" }).eq("id", connectionId);
  if (error) return { ok: false, error: "Déconnexion impossible." };
  return { ok: true, data: null };
}

export interface SyncSummary {
  imported: number;
  duplicatesSkipped: number;
}

export async function syncBankConnectionAction(connectionId: string): Promise<BankingResult<SyncSummary>> {
  if (!rowIdSchema.safeParse(connectionId).success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection) return { ok: false, error: "Connexion introuvable." };
  if (!connection.account_id) return { ok: false, error: "Connexion non rattachée à un compte." };
  if (connection.status !== "active" || !connection.enable_account_uid) {
    return { ok: false, error: "Connexion inactive — reconnectez-la." };
  }
  if (connection.valid_until && new Date(connection.valid_until) < new Date()) {
    await supabase.from("bank_connections").update({ status: "expired" }).eq("id", connectionId);
    return { ok: false, error: "Consentement expiré — reconnectez la banque." };
  }

  const dateFrom = connection.last_synced_at
    ? connection.last_synced_at.slice(0, 10)
    : connection.created_at.slice(0, 10);

  const credentials = getEnableBankingCredentials();
  const fallbackCurrency = (connection.currency ?? "EUR") as Currency;

  try {
    const allTransactions: EnableBankingTransaction[] = [];
    let continuationKey: string | undefined;
    do {
      const page = await getAccountTransactions(
        connection.enable_account_uid,
        { dateFrom, ...(continuationKey !== undefined ? { continuationKey } : {}) },
        credentials,
      );
      allTransactions.push(...page.transactions);
      continuationKey = page.continuation_key ?? undefined;
    } while (continuationKey);

    const parsedRows = normalizeEnableBankingTransactions(allTransactions, fallbackCurrency);
    if (parsedRows.length === 0) {
      await supabase.from("bank_connections").update({ last_synced_at: new Date().toISOString() }).eq("id", connectionId);
      return { ok: true, data: { imported: 0, duplicatesSkipped: 0 } };
    }

    const [{ data: existingTransactions }, { data: categories }] = await Promise.all([
      supabase.from("transactions").select("*").eq("account_id", connection.account_id),
      supabase.from("categories").select("*"),
    ]);

    const duplicateFlags = findDuplicates(parsedRows, (existingTransactions ?? []) as unknown as Transaction[]);
    const history = (existingTransactions ?? []).map((t) => ({
      label: t.label,
      merchant: t.merchant,
      category_id: t.category_id,
    }));

    // No review UI for a sync (ADR-023) — both duplicate tiers are
    // auto-excluded alike, unlike the CSV import review table which only
    // auto-excludes the certain tier and leaves the probable tier to the user.
    const newRows = parsedRows.filter((_, i) => {
      const flag = duplicateFlags[i];
      return !flag?.isCertainDuplicate && !flag?.isProbableDuplicate;
    });
    const duplicatesSkipped = parsedRows.length - newRows.length;

    if (newRows.length === 0) {
      await supabase.from("bank_connections").update({ last_synced_at: new Date().toISOString() }).eq("id", connectionId);
      return { ok: true, data: { imported: 0, duplicatesSkipped } };
    }

    const importRows = newRows.map((row) => ({
      date: row.date,
      label: row.label,
      amount: row.amount,
      type: row.type,
      currency: row.currency,
      externalRef: row.externalRef,
      categoryId: suggestCategoryId(
        { label: row.label, merchant: null },
        (categories ?? []) as unknown as Category[],
        history,
      ),
    }));

    const importResult = await importTransactionsAction({ accountId: connection.account_id, rows: importRows });
    if (!importResult.ok) return { ok: false, error: importResult.error };

    await supabase.from("bank_connections").update({ last_synced_at: new Date().toISOString() }).eq("id", connectionId);
    return { ok: true, data: { imported: importResult.imported, duplicatesSkipped } };
  } catch {
    return { ok: false, error: "Synchronisation impossible." };
  }
}
