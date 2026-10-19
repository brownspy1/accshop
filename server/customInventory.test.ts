import { describe, expect, it } from "vitest";
import { parseBulkCredentialLines } from "./customInventory";

describe("customInventory: parseBulkCredentialLines", () => {
  it("handles empty or whitespace-only inputs", () => {
    expect(parseBulkCredentialLines("")).toEqual([]);
    expect(parseBulkCredentialLines("   \n\n  \t  ")).toEqual([]);
  });

  it("splits multiline credentials and trims each line", () => {
    const raw = `
      user1@gmail.com:pass1234
      user2@example.com:secret9999

      https://redeem.link.com/promo123
         CODE-ABC-XYZ-444   
    `;
    const result = parseBulkCredentialLines(raw);
    expect(result).toEqual([
      "user1@gmail.com:pass1234",
      "user2@example.com:secret9999",
      "https://redeem.link.com/promo123",
      "CODE-ABC-XYZ-444",
    ]);
  });

  it("preserves internal colons and symbols in credentials", () => {
    const raw = "user:p@ss:w0rd!#$%\ntoken=eyJhbGciOiJIUzI1NiJ9.test\n";
    const result = parseBulkCredentialLines(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("user:p@ss:w0rd!#$%");
    expect(result[1]).toBe("token=eyJhbGciOiJIUzI1NiJ9.test");
  });
});
