import { describe, expect, it } from "vitest";
import { inspectGmailStatus, getGmailConfig } from "./gmailMailer";
import { customerRecentDeliveryMail, sendOrderConfirmationEmail, sendOrderCredentialEmail } from "./emailDelivery";

describe("Email Delivery and Gmail Mailer Suite", () => {
  it("inspectGmailStatus returns full rawUser, webhookUrl and fromName for admin configuration", async () => {
    const prevUser = process.env.GMAIL_USER;
    const prevHook = process.env.GMAIL_WEBHOOK_URL;
    const prevStore = process.env.STORE_NAME;

    process.env.GMAIL_USER = "admin@mybrand.com";
    process.env.GMAIL_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxTest/exec";
    process.env.STORE_NAME = "My Super Store";

    try {
      const status = await inspectGmailStatus();
      expect(status.configured).toBe(true);
      expect(status.mode).toBe("webhook");
      expect(status.rawUser).toBe("admin@mybrand.com");
      expect(status.webhookUrl).toBe("https://script.google.com/macros/s/AKfycbxTest/exec");
      expect(status.fromName).toBe("My Super Store");
      expect(status.user).toContain("***@mybrand.com");
    } finally {
      if (prevUser) process.env.GMAIL_USER = prevUser;
      else delete process.env.GMAIL_USER;
      if (prevHook) process.env.GMAIL_WEBHOOK_URL = prevHook;
      else delete process.env.GMAIL_WEBHOOK_URL;
      if (prevStore) process.env.STORE_NAME = prevStore;
      else delete process.env.STORE_NAME;
    }
  });

  it("sendOrderConfirmationEmail handles non-existing db gracefully without throwing", async () => {
    const result = await sendOrderConfirmationEmail(99999);
    expect(["not_configured", "not_ready", "failed"]).toContain(result);
  });

  it("sendOrderCredentialEmail handles non-existing db or order gracefully without throwing", async () => {
    const result = await sendOrderCredentialEmail(99999);
    expect(["not_configured", "not_ready", "not_verified", "failed"]).toContain(result);
  });

  it("customerRecentDeliveryMail handles non-existing db or order safely", async () => {
    const status = await customerRecentDeliveryMail(99999);
    expect(status === null || typeof status === "object").toBe(true);
  });
});
