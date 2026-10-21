import { describe, it, expect, beforeEach } from "vitest";
import {
  createAdminUser,
  deleteAdminUser,
  findAdminByUsernameOrEmail,
  listAllAdminUsers,
} from "./adminUsersAuth";

describe("Admin Users Management & Strict Lookup", () => {
  it("validates username requirements (min 2 characters, safe characters only)", async () => {
    await expect(
      createAdminUser({
        username: "a",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toThrow(/Username কমপক্ষে ২ অক্ষরের হতে হবে/);

    await expect(
      createAdminUser({
        username: "user name with spaces!",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toThrow(/ইংরেজি বর্ণ, সংখ্যা, হাইফেন বা আন্ডারস্কোর/);
  });

  it("validates password length (minimum 6 characters)", async () => {
    await expect(
      createAdminUser({
        username: "validuser",
        email: "valid@example.com",
        password: "123",
      })
    ).rejects.toThrow(/পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে/);
  });

  it("validates email format", async () => {
    await expect(
      createAdminUser({
        username: "validuser",
        email: "not-an-email",
        password: "password123",
      })
    ).rejects.toThrow(/সঠিক ইমেইল ঠিকানা দিন/);
  });
});
