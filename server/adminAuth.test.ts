import { describe, expect, it } from "vitest";
import { hashAdminPassword, verifyAdminPassword, verifyFallbackAdminSecret } from "./adminAuth";

describe("adminAuth cryptographic utilities", () => {
  it("hashes password with a random unique salt and generates a 128-hex-char scrypt hash", () => {
    const { hash, salt } = hashAdminPassword("SuperSecretAdminPass123");
    expect(hash).toHaveLength(128); // 64 bytes in hex = 128 chars
    expect(salt).toHaveLength(32); // 16 bytes in hex = 32 chars
    expect(verifyAdminPassword("SuperSecretAdminPass123", hash, salt)).toBe(true);
    expect(verifyAdminPassword("WrongPassword", hash, salt)).toBe(false);
  });

  it("produces different hashes for the same password due to random salts", () => {
    const run1 = hashAdminPassword("myPassword");
    const run2 = hashAdminPassword("myPassword");
    expect(run1.salt).not.toBe(run2.salt);
    expect(run1.hash).not.toBe(run2.hash);
    expect(verifyAdminPassword("myPassword", run1.hash, run1.salt)).toBe(true);
    expect(verifyAdminPassword("myPassword", run2.hash, run2.salt)).toBe(true);
  });

  it("fails verification with corrupted salt or hash", () => {
    const { hash, salt } = hashAdminPassword("validPassword");
    expect(verifyAdminPassword("validPassword", hash.slice(0, -2) + "aa", salt)).toBe(false);
    expect(verifyAdminPassword("validPassword", hash, salt.slice(0, -2) + "bb")).toBe(false);
  });

  it("handles fallback environment secret checking", () => {
    expect(verifyFallbackAdminSecret("admin123")).toBe(true);
    expect(verifyFallbackAdminSecret("wrong")).toBe(false);
  });
});
