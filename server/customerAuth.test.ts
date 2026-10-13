import { afterEach, describe, expect, it, vi } from "vitest";
import { CUSTOMER_COOKIE, createCustomerSessionToken, hashMagicToken, newMagicToken, parseCustomerSessionCookie } from "./customerAuth";

describe("customer account credentials", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("signs and verifies a seven-day HttpOnly cookie payload without exposing a bearer token", () => {
    vi.stubEnv("MANUS_JWT_SECRET", "unit-test-session-secret-at-least-32-bytes");
    vi.stubEnv("MANUS_PROJECT_ID", "accshop-unit-test");
    const token = createCustomerSessionToken(17, 2_000_000_000_000);
    expect(parseCustomerSessionCookie(`${CUSTOMER_COOKIE}=${token}`, 2_000_000_000_000)).toBe(17);
    expect(parseCustomerSessionCookie(`${CUSTOMER_COOKIE}=${token}`, 2_000_700_000_000)).toBeNull();
    expect(parseCustomerSessionCookie(`${CUSTOMER_COOKIE}=${token.slice(0, -2)}xx`, 2_000_000_000_000)).toBeNull();
  });
  it("uses random raw magic links and stores only a one-way SHA-256 hash", () => {
    const first = newMagicToken();
    const second = newMagicToken();
    expect(first.token).not.toBe(second.token);
    expect(first.hash).toBe(hashMagicToken(first.token));
    expect(first.hash).not.toBe(first.token);
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
