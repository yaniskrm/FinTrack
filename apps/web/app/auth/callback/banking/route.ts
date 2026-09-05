import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { exchangeAuthorizationCode } from "@fintrack/core/server";
import { createClient } from "../../../../lib/supabase/server";
import { getEnableBankingCredentials } from "../../../../lib/banking/credentials";

/**
 * Enable Banking redirects the user's browser back here with `code` and the
 * `state` we generated in startBankConnectionAction (a bank_connections.id
 * correlator — the callback carries no other context). Never trusts the
 * `state` blindly: it's only ever accepted if it matches a `pending` row,
 * which RLS already scopes to the signed-in user's own workspace.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings/accounts?banking=error`);
  }

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("bank_connections")
    .select("id")
    .eq("state", state)
    .eq("status", "pending")
    .maybeSingle();

  if (!pending) {
    return NextResponse.redirect(`${origin}/settings/accounts?banking=error`);
  }

  try {
    const session = await exchangeAuthorizationCode(code, getEnableBankingCredentials());
    const [firstAccount, ...restAccounts] = session.accounts;

    if (!firstAccount) {
      await supabase.from("bank_connections").delete().eq("id", pending.id);
      return NextResponse.redirect(`${origin}/settings/accounts?banking=error`);
    }

    await supabase
      .from("bank_connections")
      .update({
        session_id: session.session_id,
        enable_account_uid: firstAccount.uid,
        iban: firstAccount.iban,
        currency: firstAccount.currency,
        valid_until: session.access.valid_until,
        status: "active",
      })
      .eq("id", pending.id);

    if (restAccounts.length > 0) {
      const { data: original } = await supabase
        .from("bank_connections")
        .select("workspace_id, aspsp_name, aspsp_country")
        .eq("id", pending.id)
        .single();

      if (original) {
        await supabase.from("bank_connections").insert(
          restAccounts.map((account) => ({
            workspace_id: original.workspace_id,
            aspsp_name: original.aspsp_name,
            aspsp_country: original.aspsp_country,
            session_id: session.session_id,
            enable_account_uid: account.uid,
            iban: account.iban,
            currency: account.currency,
            valid_until: session.access.valid_until,
            status: "active" as const,
          })),
        );
      }
    }

    return NextResponse.redirect(`${origin}/settings/accounts?banking=success`);
  } catch {
    await supabase.from("bank_connections").delete().eq("id", pending.id);
    return NextResponse.redirect(`${origin}/settings/accounts?banking=error`);
  }
}
