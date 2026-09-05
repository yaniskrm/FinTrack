import { describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  EnableBankingApiError,
  deleteSession,
  exchangeAuthorizationCode,
  getAccountTransactions,
  listAspsps,
  startAuthorization,
} from "./client.js";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const credentials = { appId: "app-123", privateKeyPem: privateKey };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("listAspsps", () => {
  it("requests the given country and returns the aspsps array", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ aspsps: [{ name: "Mock ASPSP", country: "FR" }] }));

    const result = await listAspsps("FR", credentials, fetchMock);

    expect(result).toEqual([{ name: "Mock ASPSP", country: "FR" }]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.enablebanking.com/aspsps?country=FR");
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Bearer /);
  });

  it("throws EnableBankingApiError on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "unauthorized" }, 401));
    await expect(listAspsps("FR", credentials, fetchMock)).rejects.toThrow(EnableBankingApiError);
  });
});

describe("startAuthorization", () => {
  it("POSTs the redirect/consent parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ url: "https://bank.example/consent", authorization_id: "auth-1" }));

    const result = await startAuthorization(
      {
        aspspName: "Mock ASPSP",
        aspspCountry: "FR",
        redirectUrl: "https://app.example/auth/callback/banking",
        state: "state-uuid",
        validUntil: "2027-01-01T00:00:00Z",
      },
      credentials,
      fetchMock,
    );

    expect(result.url).toBe("https://bank.example/consent");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      aspsp: { name: "Mock ASPSP", country: "FR" },
      state: "state-uuid",
      redirect_url: "https://app.example/auth/callback/banking",
      psu_type: "personal",
    });
  });
});

describe("exchangeAuthorizationCode", () => {
  it("POSTs the code and returns the session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        session_id: "session-1",
        accounts: [{ uid: "acc-1", iban: "FR7612345", currency: "EUR" }],
        access: { valid_until: "2027-01-01T00:00:00Z" },
      }),
    );

    const result = await exchangeAuthorizationCode("code-abc", credentials, fetchMock);

    expect(result.session_id).toBe("session-1");
    expect(result.accounts).toHaveLength(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ code: "code-abc" });
  });
});

describe("getAccountTransactions", () => {
  it("includes date_from and continuation_key when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ transactions: [], continuation_key: null }));

    await getAccountTransactions(
      "acc-1",
      { dateFrom: "2026-08-01", continuationKey: "ck-1" },
      credentials,
      fetchMock,
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      "https://api.enablebanking.com/accounts/acc-1/transactions?date_from=2026-08-01&continuation_key=ck-1",
    );
  });

  it("omits the query string entirely when no params are given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ transactions: [], continuation_key: null }));
    await getAccountTransactions("acc-1", {}, credentials, fetchMock);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.enablebanking.com/accounts/acc-1/transactions");
  });
});

describe("deleteSession", () => {
  it("sends a DELETE request to the session endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    await deleteSession("session-1", credentials, fetchMock);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.enablebanking.com/sessions/session-1");
    expect(init.method).toBe("DELETE");
  });
});
