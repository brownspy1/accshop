import { afterEach, describe, expect, it, vi } from "vitest";
import { listResendDomains, ResendApiError, sendResendEmail, verifiedSenderDomain } from "./resend";

describe("Resend transactional mail contract", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("lists only normalized verified/sending domains with bearer authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [
      { id: "dom_1", name: "Mail.Example.com", status: "verified", capabilities: { sending: "enabled" } },
      { id: "dom_2", name: "pending.example.com", status: "pending", capabilities: { sending: "disabled" } },
    ] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const domains = await listResendDomains("test-key-never-used-externally");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.resend.com/domains");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer test-key-never-used-externally" });
    expect(domains).toEqual([
      { id: "dom_1", name: "mail.example.com", status: "verified", sendingEnabled: true },
      { id: "dom_2", name: "pending.example.com", status: "pending", sendingEnabled: false },
    ]);
    expect(verifiedSenderDomain("Shop <orders@mail.example.com>", domains)?.id).toBe("dom_1");
    expect(verifiedSenderDomain("orders@outside.example", domains)).toBeNull();
  });
  it("sends a single-recipient message with a stable idempotency header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendResendEmail("test-key-never-used-externally", { from: "Shop <orders@mail.example.com>", to: "customer@example.net", subject: "Order ready", html: "<p>Codes</p>", text: "Codes", idempotencyKey: "accshop-order-42-delivery" });
    expect(result.id).toBe("email_123");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ "Idempotency-Key": "accshop-order-42-delivery" });
    expect(JSON.parse(String(init.body))).toMatchObject({ to: ["customer@example.net"], subject: "Order ready" });
  });
  it("does not include API keys or provider bodies in errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "do not expose this", key: "secret" }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(listResendDomains("test-secret-value")).rejects.toMatchObject({ code: "http_401", ambiguous: false });
    try { await listResendDomains("test-secret-value"); } catch (error) {
      expect((error as Error).message).not.toContain("test-secret-value");
      expect((error as Error).message).not.toContain("do not expose this");
    }
  });
  it("marks an uncertain post-send response as ambiguous", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not-json", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendResendEmail("test-key", { from: "a@example.com", to: "b@example.com", subject: "x", html: "x", text: "x", idempotencyKey: "request-1" })).rejects.toBeInstanceOf(ResendApiError);
  });
});
