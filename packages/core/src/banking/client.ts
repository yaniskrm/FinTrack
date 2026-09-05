import { signEnableBankingJwt } from "./jwt.js";
import type { EnableBankingCredentials } from "./jwt.js";
import type {
  AuthorizeSessionResult,
  EnableBankingAspsp,
  StartAuthorizationResult,
  TransactionsPage,
} from "./types.js";

const BASE_URL = "https://api.enablebanking.com";

/** Injectable so tests never hit the real API — production callers omit it. */
export type FetchLike = typeof fetch;

export class EnableBankingApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "EnableBankingApiError";
  }
}

async function request<T>(
  path: string,
  credentials: EnableBankingCredentials,
  fetchImpl: FetchLike,
  init?: RequestInit,
): Promise<T> {
  const jwt = signEnableBankingJwt(credentials);
  const response = await fetchImpl(`${BASE_URL}${path}`, {
    ...(init?.method !== undefined ? { method: init.method } : {}),
    ...(init?.body !== undefined ? { body: init.body } : {}),
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new EnableBankingApiError(response.status, `Enable Banking API ${String(response.status)}: ${path}`);
  }

  return (await response.json()) as T;
}

export async function listAspsps(
  country: string,
  credentials: EnableBankingCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<EnableBankingAspsp[]> {
  const { aspsps } = await request<{ aspsps: EnableBankingAspsp[] }>(
    `/aspsps?country=${encodeURIComponent(country)}`,
    credentials,
    fetchImpl,
  );
  return aspsps;
}

export interface StartAuthorizationParams {
  aspspName: string;
  aspspCountry: string;
  redirectUrl: string;
  state: string;
  validUntil: string; // ISO date-time
}

export async function startAuthorization(
  params: StartAuthorizationParams,
  credentials: EnableBankingCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<StartAuthorizationResult> {
  return request<StartAuthorizationResult>("/auth", credentials, fetchImpl, {
    method: "POST",
    body: JSON.stringify({
      access: { valid_until: params.validUntil },
      aspsp: { name: params.aspspName, country: params.aspspCountry },
      state: params.state,
      redirect_url: params.redirectUrl,
      psu_type: "personal",
    }),
  });
}

export async function exchangeAuthorizationCode(
  code: string,
  credentials: EnableBankingCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<AuthorizeSessionResult> {
  return request<AuthorizeSessionResult>("/sessions", credentials, fetchImpl, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export interface GetTransactionsParams {
  dateFrom?: string; // ISO date, inclusive
  continuationKey?: string;
}

export async function getAccountTransactions(
  accountUid: string,
  params: GetTransactionsParams,
  credentials: EnableBankingCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<TransactionsPage> {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.continuationKey) query.set("continuation_key", params.continuationKey);
  const qs = query.toString();

  return request<TransactionsPage>(
    `/accounts/${accountUid}/transactions${qs ? `?${qs}` : ""}`,
    credentials,
    fetchImpl,
  );
}

export async function deleteSession(
  sessionId: string,
  credentials: EnableBankingCredentials,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  await request<unknown>(`/sessions/${sessionId}`, credentials, fetchImpl, { method: "DELETE" });
}
