import { describe, expect, it } from "vitest";
import { extractCodeStrings } from "./shopRouter";

describe("extractCodeStrings", () => {
  it("returns empty array for null, empty or undefined", () => {
    expect(extractCodeStrings(null)).toEqual([]);
    expect(extractCodeStrings("")).toEqual([]);
    expect(extractCodeStrings("   ")).toEqual([]);
  });

  it("extracts clean strings from a simple JSON string array", () => {
    const raw = JSON.stringify(["CODE-AAA", "CODE-BBB"]);
    expect(extractCodeStrings(raw)).toEqual(["CODE-AAA", "CODE-BBB"]);
  });

  it("extracts codeValue strings from provider objects with id, serviceKey, codeType (React Error 31 fix)", () => {
    const raw = JSON.stringify([
      {
        id: "ord-1-0",
        serviceKey: "canva-1m",
        codeType: "coupon",
        codeValue: "CANVA-VIP-2026-X9",
      },
      {
        id: "ord-1-1",
        serviceKey: "canva-1m",
        codeType: "coupon",
        codeValue: "CANVA-VIP-2026-Y8",
      },
    ]);

    const result = extractCodeStrings(raw);
    expect(result).toEqual(["CANVA-VIP-2026-X9", "CANVA-VIP-2026-Y8"]);
    // Must be pure strings, never objects
    result.forEach(code => {
      expect(typeof code).toBe("string");
    });
  });

  it("handles alternative object properties like code, value, or secret", () => {
    const raw = JSON.stringify([
      { code: "PROMO-123" },
      { value: "TOKEN-456" },
      { secret: "KEY-789" },
    ]);
    expect(extractCodeStrings(raw)).toEqual(["PROMO-123", "TOKEN-456", "KEY-789"]);
  });

  it("falls back gracefully on plain text non-JSON string", () => {
    expect(extractCodeStrings("DIRECT-RAW-CODE-001")).toEqual(["DIRECT-RAW-CODE-001"]);
  });
});
