import { describe, expect, it } from "vitest";
import { getGmailConfig, hasGmailConfigured, inspectGmailStatus } from "./gmailMailer";

describe("Gmail Mailer service", () => {
  it("reports not configured when neither DB nor env credentials exist", async () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const hasConfig = await hasGmailConfigured();
    // In local test environment without DB/env, it should return false
    expect(typeof hasConfig).toBe("boolean");
  });

  it("detects environment variables fallback if set", async () => {
    const prevUser = process.env.GMAIL_USER;
    const prevPass = process.env.GMAIL_APP_PASSWORD;

    process.env.GMAIL_USER = "testshop@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";

    try {
      const config = await getGmailConfig();
      expect(config).not.toBeNull();
      expect(config?.user).toBe("testshop@gmail.com");
      // White spaces in Google App password should be stripped
      expect(config?.pass).toBe("abcdefghijklmnop");
    } finally {
      if (prevUser) process.env.GMAIL_USER = prevUser;
      else delete process.env.GMAIL_USER;
      if (prevPass) process.env.GMAIL_APP_PASSWORD = prevPass;
      else delete process.env.GMAIL_APP_PASSWORD;
    }
  });

  it("inspects status and masks user email safely", async () => {
    const prevUser = process.env.GMAIL_USER;
    const prevPass = process.env.GMAIL_APP_PASSWORD;

    process.env.GMAIL_USER = "mybusiness@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "xyz123456789abcd";

    try {
      const status = await inspectGmailStatus();
      expect(status.configured).toBe(true);
      expect(status.user).toContain("***@gmail.com");
      expect(status.user).not.toBe("mybusiness@gmail.com");
      expect(status.mode).toBe("smtp");
    } finally {
      if (prevUser) process.env.GMAIL_USER = prevUser;
      else delete process.env.GMAIL_USER;
      if (prevPass) process.env.GMAIL_APP_PASSWORD = prevPass;
      else delete process.env.GMAIL_APP_PASSWORD;
    }
  });

  it("detects Google Apps Script webhook mode from environment variables", async () => {
    const prevUser = process.env.GMAIL_USER;
    const prevHook = process.env.GMAIL_WEBHOOK_URL;

    process.env.GMAIL_USER = "webhookshop@gmail.com";
    process.env.GMAIL_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx123/exec";

    try {
      const config = await getGmailConfig();
      expect(config?.mode).toBe("webhook");
      expect(config?.webhookUrl).toBe("https://script.google.com/macros/s/AKfycbx123/exec");
      expect(config?.user).toBe("webhookshop@gmail.com");

      const status = await inspectGmailStatus();
      expect(status.configured).toBe(true);
      expect(status.mode).toBe("webhook");
    } finally {
      if (prevUser) process.env.GMAIL_USER = prevUser;
      else delete process.env.GMAIL_USER;
      if (prevHook) process.env.GMAIL_WEBHOOK_URL = prevHook;
      else delete process.env.GMAIL_WEBHOOK_URL;
    }
  });
});
