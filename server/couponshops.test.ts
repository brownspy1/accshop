import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./providerCredentials", () => ({
  getProviderApiKey: vi.fn(async () => "csk_test_only"),
  verifyAndSaveProviderApiKey: vi.fn(async (_provider: string, key: string, verify: (value: string) => Promise<unknown>) => verify(key)),
}));

import {
  CouponShopsError,
  createCouponOrder,
  getCouponServices,
  retrieveCouponOrder,
  verifyAndSaveCouponShopsKey,
} from "./couponshops";

const fetchMock = vi.fn<typeof fetch>();
const orderResponse = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  order: {
    order_id: "API3F9A1C2B7D4E5F60",
    client_order_id: "CS-test-client-order",
    status: "completed",
    service_id: "service_5",
    quantity: 1,
    amount_inr: 171,
    amount_usdt: 1.71,
    coupons: ["TEST-COUPON-CODE"],
    ...overrides,
  },
  balance_usdt: 10.79,
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("CouponShops server API client", () => {
  it("loads normalized service slabs via the documented X-API-Key header without exposing cost on public data", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: true,
      rate_inr_per_usdt: 100,
      services: [{
        service_id: "service_5",
        name: "Coupon service",
        stock: 42,
        pricing: [{ min_qty: 1, max_qty: 2, price_inr: 171, price_usdt: 1.71 }],
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const services = await getCouponServices();
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).href).toBe("https://api.couponshops.org/api/v1/services");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "X-API-Key": "csk_test_only" });
    expect(services).toEqual([{
      serviceId: "service_5", name: "Coupon service", stock: 42, rateInrPerUsdt: 100,
      tiers: [{ minQuantity: 1, maxQuantity: 2, priceInr: 171, priceUsdt: 1.71 }],
    }]);
  }, 15_000);

  it("validates an API key against /balance before the credential helper saves it", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, balance_usdt: 12.5, balance_inr: 1250, rate_inr_per_usdt: 100 }), {
      status: 200, headers: { "Content-Type": "application/json" },
    }));
    await expect(verifyAndSaveCouponShopsKey("csk_test_only")).resolves.toEqual({
      balanceUsdt: 12.5, balanceInr: 1250, rateInrPerUsdt: 100,
    });
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).href).toBe("https://api.couponshops.org/api/v1/balance");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "X-API-Key": "csk_test_only" });
  }, 15_000);

  it("creates orders with the saved idempotency identity and retrieves provider state by order_id", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(orderResponse()), { status: 201, headers: { "Content-Type": "application/json" } }));
    const created = await createCouponOrder("service_5", 1, "CS-test-client-order");
    expect(created.status).toBe("completed");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      service_id: "service_5", quantity: 1, client_order_id: "CS-test-client-order",
    });
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).href).toBe("https://api.couponshops.org/api/v1/orders");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(orderResponse({ status: "processing", coupons: [] })), { status: 200, headers: { "Content-Type": "application/json" } }));
    const retrieved = await retrieveCouponOrder("API3F9A1C2B7D4E5F60");
    expect(retrieved.status).toBe("processing");
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).href).toBe("https://api.couponshops.org/api/v1/orders/API3F9A1C2B7D4E5F60");
  }, 15_000);

  it("correctly ingests Gemini and diverse services with high max_qty, flat pricing, or INR-only tiers", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: true,
      rate_inr_per_usdt: 100,
      services: [
        {
          service_id: "gemini_pro_18m",
          name: "Gemini Pro 18M NEW",
          stock: 50,
          pricing: [{ min_qty: 1, max_qty: 500, price_inr: 80, price_usdt: 0.8 }],
        },
        {
          service_id: "gemini-advanced.v2",
          name: "Gemini Advanced 1M",
          stock: 0,
          price_inr: 250,
        },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const services = await getCouponServices();
    expect(services).toHaveLength(2);
    expect(services[0]).toMatchObject({
      serviceId: "gemini_pro_18m",
      name: "Gemini Pro 18M NEW",
      stock: 50,
      tiers: [{ minQuantity: 1, maxQuantity: 500, priceInr: 80, priceUsdt: 0.8 }],
    });
    expect(services[1]).toMatchObject({
      serviceId: "gemini-advanced.v2",
      name: "Gemini Advanced 1M",
      stock: 0,
      tiers: [{ minQuantity: 1, priceInr: 250, priceUsdt: 2.5 }],
    });
  });

  it("treats insufficient wallet balance as a definite failure and does not echo provider text", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "insufficient_balance", message: "private provider message" }), {
      status: 402, headers: { "Content-Type": "application/json" },
    }));
    const error = await createCouponOrder("service_5", 1, "CS-test-client-order").catch(value => value);
    expect(error).toBeInstanceOf(CouponShopsError);
    expect((error as CouponShopsError).ambiguous).toBe(false);
    expect((error as Error).message).not.toContain("private provider message");
  }, 15_000);
});
