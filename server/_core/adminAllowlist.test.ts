import { afterEach, describe, expect, it } from "vitest";
import { isAdminEmail } from "./adminAllowlist";

const previousPlural = process.env.ACCZONE_ADMIN_EMAILS;
const previousSingular = process.env.ACCZONE_ADMIN_EMAIL;

afterEach(() => {
  if (previousPlural === undefined) delete process.env.ACCZONE_ADMIN_EMAILS;
  else process.env.ACCZONE_ADMIN_EMAILS = previousPlural;
  if (previousSingular === undefined) delete process.env.ACCZONE_ADMIN_EMAIL;
  else process.env.ACCZONE_ADMIN_EMAIL = previousSingular;
});

describe("admin email allowlist", () => {
  it("accepts every normalized address in a comma-separated plural list", () => {
    process.env.ACCZONE_ADMIN_EMAILS = " first@example.com, SECOND@example.com ";
    process.env.ACCZONE_ADMIN_EMAIL = "fallback@example.com";
    expect(isAdminEmail("FIRST@example.com")).toBe(true);
    expect(isAdminEmail(" second@example.com ")).toBe(true);
    expect(isAdminEmail("fallback@example.com")).toBe(false);
    expect(isAdminEmail("other@example.com")).toBe(false);
  });

  it("falls back to the existing singular secret until the plural protected setting is configured", () => {
    delete process.env.ACCZONE_ADMIN_EMAILS;
    process.env.ACCZONE_ADMIN_EMAIL = " Single@example.com ";
    expect(isAdminEmail("single@example.com")).toBe(true);
    expect(isAdminEmail(null)).toBe(false);
  });
});
