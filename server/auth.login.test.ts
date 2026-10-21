import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type SetCookieCall = {
  name: string;
  val: string;
  options: Record<string, unknown>;
};

function createUnauthContext(): { ctx: TrpcContext; setCookies: SetCookieCall[] } {
  const setCookies: SetCookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string, options: Record<string, unknown>) => {
        setCookies.push({ name, val, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth.loginWithSecret", () => {
  const originalPassword = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalPassword;
  });

  it("authenticates with the configured admin password and issues a cookie", async () => {
    process.env.ADMIN_PASSWORD = "test-secret-password-xyz";
    const { ctx, setCookies } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginWithSecret({ password: "test-secret-password-xyz" });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe("admin");
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
    expect(typeof setCookies[0]?.val).toBe("string");
    expect(setCookies[0]?.options).toMatchObject({
      path: "/",
      httpOnly: true,
      secure: true,
    });
  });

  it("rejects an invalid password with an unauthorized error", async () => {
    process.env.ADMIN_PASSWORD = "test-secret-password-xyz";
    const { ctx, setCookies } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.loginWithSecret({ password: "wrong-password" })).rejects.toThrow(
      "Admin password বা secret key সঠিক নয়।"
    );
    expect(setCookies).toHaveLength(0);
  });

  it("strictly rejects any unknown or unregistered username even if password is correct", async () => {
    process.env.ADMIN_PASSWORD = "test-secret-password-xyz";
    const { ctx, setCookies } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.loginWithSecret({
      username: "random_hacker_user",
      password: "test-secret-password-xyz"
    })).rejects.toThrow(
      /শুধুমাত্র রেজিস্টার্ড অ্যাডমিন প্রবেশ করতে পারবেন/
    );
    expect(setCookies).toHaveLength(0);
  });
});
