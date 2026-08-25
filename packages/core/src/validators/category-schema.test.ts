import { describe, expect, it } from "vitest";
import { categoryInputSchema } from "./category-schema.js";

const valid = { name: "Cadeaux", icon: "🎁", color: "#F59E0B" };

describe("categoryInputSchema", () => {
  it("accepts a valid category", () => {
    expect(categoryInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(categoryInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects a name longer than 50 chars", () => {
    expect(categoryInputSchema.safeParse({ ...valid, name: "x".repeat(51) }).success).toBe(false);
  });

  it("rejects an empty icon", () => {
    expect(categoryInputSchema.safeParse({ ...valid, icon: "" }).success).toBe(false);
  });

  it("rejects a malformed color", () => {
    expect(categoryInputSchema.safeParse({ ...valid, color: "orange" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...valid, color: "#ABC" }).success).toBe(false);
  });

  it("accepts a lowercase hex color", () => {
    expect(categoryInputSchema.safeParse({ ...valid, color: "#f59e0b" }).success).toBe(true);
  });
});
