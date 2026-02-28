import { describe, it, expect } from "vitest";
import { translateError } from "./errors";

describe("translateError", () => {
  describe("Turkish (tr)", () => {
    it("returns generic error for empty/null input", () => {
      expect(translateError("", "tr")).toBe("Bir hata oluştu.");
      // @ts-expect-error: testing invalid input
      expect(translateError(null, "tr")).toBe("Bir hata oluştu.");
    });

    it('maps "rejected" to Turkish rejection message', () => {
      const result = translateError("User declined to sign", "tr");
      expect(result).toContain("reddedildi");
    });

    it('maps "insufficient balance" to Turkish balance message', () => {
      const result = translateError("insufficient balance", "tr");
      expect(result).toContain("Yetersiz bakiye");
    });

    it('maps "wallet not found" to Turkish wallet message', () => {
      const result = translateError("wallet not found", "tr");
      expect(result).toContain("Cüzdan bulunamadı");
    });

    it('maps "group not found" correctly', () => {
      expect(translateError("group not found", "tr")).toBe("Grup bulunamadı.");
    });

    it('maps "amount must be positive" correctly', () => {
      expect(translateError("amount must be positive", "tr")).toBe(
        "Tutar pozitif olmalı.",
      );
    });
  });

  describe("English (en)", () => {
    it("returns generic error for empty/null input", () => {
      expect(translateError("", "en")).toBe("An error occurred.");
    });

    it('maps "insufficient balance" to English balance message', () => {
      const result = translateError("insufficient balance", "en");
      expect(result).toContain("Insufficient balance");
    });

    it('maps "wallet not found" to English wallet message', () => {
      const result = translateError("wallet not found", "en");
      expect(result).toContain("Wallet not found");
    });

    it("returns original message when no pattern matches", () => {
      const unknown = "Some completely unknown error XYZ";
      expect(translateError(unknown, "en")).toBe(unknown);
    });

    it('maps "at least 2 members required" correctly', () => {
      expect(translateError("at least 2 members required", "en")).toBe(
        "At least 2 members required.",
      );
    });
  });
});
