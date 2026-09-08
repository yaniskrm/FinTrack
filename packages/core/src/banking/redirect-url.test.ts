import { describe, expect, it } from "vitest";
import { BANKING_CALLBACK_PATH, buildBankingRedirectUrl } from "./redirect-url.js";

describe("buildBankingRedirectUrl", () => {
  it("appends the callback path to a bare origin", () => {
    expect(buildBankingRedirectUrl("http://localhost:3000")).toBe("http://localhost:3000/auth/callback/banking");
  });

  it("appends the callback path to an https production domain", () => {
    expect(buildBankingRedirectUrl("https://fintrack.example.com")).toBe(
      "https://fintrack.example.com/auth/callback/banking",
    );
  });

  it("strips a single trailing slash before appending", () => {
    expect(buildBankingRedirectUrl("https://fintrack.example.com/")).toBe(
      "https://fintrack.example.com/auth/callback/banking",
    );
  });

  it("strips multiple trailing slashes before appending", () => {
    expect(buildBankingRedirectUrl("https://fintrack.example.com///")).toBe(
      "https://fintrack.example.com/auth/callback/banking",
    );
  });

  it("uses the exported BANKING_CALLBACK_PATH constant", () => {
    expect(buildBankingRedirectUrl("https://example.com")).toBe(`https://example.com${BANKING_CALLBACK_PATH}`);
  });
});
