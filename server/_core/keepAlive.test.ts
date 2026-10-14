import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executePing, startKeepAlive } from "./keepAlive";

describe("keepAlive helper", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("startKeepAlive", () => {
    it("does not start timers in development unless explicitly enabled", () => {
      process.env.NODE_ENV = "development";
      delete process.env.ENABLE_KEEP_ALIVE;

      const handle = startKeepAlive();
      expect(handle).toBeUndefined();
    });

    it("initializes timers and provides a working stop function in production", () => {
      process.env.NODE_ENV = "production";
      process.env.KEEP_ALIVE_URL = "https://accshop-767l.onrender.com/api/health";
      process.env.KEEP_ALIVE_INTERVAL_MINUTES = "10";

      const handle = startKeepAlive();
      expect(handle).toBeDefined();
      expect(handle?.initialTimer).toBeDefined();
      expect(handle?.periodicTimer).toBeDefined();

      // Clean up timer handles
      handle?.stop();
    });
  });

  describe("executePing", () => {
    it("returns true on a successful 200 OK HTTP response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal("fetch", fetchMock);

      const success = await executePing("https://accshop-767l.onrender.com/api/health");
      expect(success).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://accshop-767l.onrender.com/api/health",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "User-Agent": "AccShop-Internal-Heartbeat/1.0",
          }),
        })
      );
    });

    it("handles fetch errors gracefully without throwing", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("Connection timeout"));
      vi.stubGlobal("fetch", fetchMock);

      const success = await executePing("https://accshop-767l.onrender.com/api/health");
      expect(success).toBe(false);
    });
  });
});
