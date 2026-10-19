import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  normalizeBotResellerUrl,
  testBotResellerConnection,
  getBotResellerProducts,
  createBotResellerOrder,
  retrieveBotResellerOrder,
  BotResellerError,
} from "./botReseller";

describe("Bot Reseller v1 API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("normalizeBotResellerUrl", () => {
    it("handles standard base URLs and docs URLs", () => {
      expect(normalizeBotResellerUrl("https://bot.aitoolifystudio.io/docs")).toBe(
        "https://bot.aitoolifystudio.io/api/reseller/v1",
      );
      expect(normalizeBotResellerUrl("https://bot.aitoolifystudio.io")).toBe(
        "https://bot.aitoolifystudio.io/api/reseller/v1",
      );
      expect(normalizeBotResellerUrl("bot.aitoolifystudio.io/")).toBe(
        "https://bot.aitoolifystudio.io/api/reseller/v1",
      );
      expect(normalizeBotResellerUrl("https://example.com/api/reseller/v1")).toBe(
        "https://example.com/api/reseller/v1",
      );
    });
  });

  describe("testBotResellerConnection", () => {
    it("returns balance and currency on valid 200 response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, balance: 125.5, currency: "USDT" }),
      } as any);

      const res = await testBotResellerConnection("https://bot.aitoolifystudio.io", "sk_live_test123");
      expect(res.success).toBe(true);
      expect(res.balance).toBe(125.5);
      expect(res.currency).toBe("USDT");
    });

    it("throws BotResellerError on 401 unauthorized", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ success: false, error: "Invalid API key", error_code: "INVALID_API_KEY" }),
      } as any);

      await expect(testBotResellerConnection("https://bot.aitoolifystudio.io", "bad_key")).rejects.toThrow(
        BotResellerError,
      );
    });
  });

  describe("getBotResellerProducts", () => {
    it("normalizes product objects with your_cost, stock, and unlimited", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            products: [
              {
                id: 42,
                name: "Netflix Premium 1 Month",
                price_usdt: 7.5,
                your_cost: 7.0,
                stock: 14,
                is_unlimited: false,
                requires_email: false,
              },
              {
                id: 58,
                name: "Canva Pro Edu 1 Year",
                price_usdt: 10,
                stock: null,
                is_unlimited: true,
                requires_email: true,
              },
            ],
          }),
      } as any);

      const items = await getBotResellerProducts("https://bot.aitoolifystudio.io", "sk_live_test123");
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        id: "42",
        name: "Netflix Premium 1 Month",
        description: null,
        priceUsdt: 7.0,
        stock: 14,
        isUnlimited: false,
        requiresEmail: false,
        type: "digital",
      });
      expect(items[1].isUnlimited).toBe(true);
      expect(items[1].stock).toBe(999);
      expect(items[1].requiresEmail).toBe(true);
    });
  });

  describe("createBotResellerOrder", () => {
    it("sends order payload and extracts delivered credentials", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            order_ref: "ORDER7K2QX9DLM4",
            order_id: 123,
            status: "completed",
            amount_charged: 15.0,
            delivered: ["email1:pass1", "email2:pass2"],
          }),
      } as any);

      const res = await createBotResellerOrder("https://bot.aitoolifystudio.io", "sk_live_test", {
        productId: 42,
        quantity: 2,
        idempotencyKey: "cart-1234",
      });

      expect(res.success).toBe(true);
      expect(res.orderRef).toBe("ORDER7K2QX9DLM4");
      expect(res.delivered).toEqual(["email1:pass1", "email2:pass2"]);
      expect(res.status).toBe("completed");
    });
  });

  describe("retrieveBotResellerOrder", () => {
    it("fetches single order credentials by order_ref", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            order_ref: "ORDER7K2QX9DLM4",
            order_id: 123,
            status: "completed",
            delivered: ["email1:pass1"],
          }),
      } as any);

      const res = await retrieveBotResellerOrder("https://bot.aitoolifystudio.io", "sk_live_test", "ORDER7K2QX9DLM4");
      expect(res.success).toBe(true);
      expect(res.delivered).toHaveLength(1);
    });
  });
});
