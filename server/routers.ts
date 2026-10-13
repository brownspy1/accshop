import { createHash, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { shopRouter } from "./shopRouter";
import { customerAccountRouter } from "./customerRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  shop: shopRouter,
  customer: customerAccountRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    loginWithSecret: publicProcedure.input(z.object({
      password: z.string().min(1, "Password is required"),
    })).mutation(async ({ input, ctx }) => {
      const configuredPassword = process.env.ADMIN_PASSWORD?.trim() || process.env.ACCZONE_ADMIN_KEY?.trim() || process.env.ADMIN_KEY?.trim() || "admin123";
      const candidateBuffer = Buffer.from(input.password.trim());
      const expectedBuffer = Buffer.from(configuredPassword);
      const isMatch = candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
      if (!isMatch) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin password বা secret key সঠিক নয়।" });
      }

      const adminEmail = process.env.ACCZONE_ADMIN_EMAIL?.trim() || "admin@acczone.shop";
      const adminOpenId = `admin_${createHash("sha256").update(adminEmail).digest("hex").slice(0, 16)}`;

      try {
        await db.upsertUser({
          openId: adminOpenId,
          name: "Store Admin",
          email: adminEmail,
          loginMethod: "key",
          role: "admin",
          lastSignedIn: new Date(),
        });
      } catch (e) {
        console.warn("[Auth] Could not upsert admin user into DB:", e);
      }

      const adminSessionMs = 7 * 24 * 60 * 60 * 1000;
      const sessionToken = await sdk.createSessionToken(adminOpenId, {
        name: "Store Admin",
        expiresInMs: adminSessionMs,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: adminSessionMs });

      return {
        success: true,
        user: { openId: adminOpenId, name: "Store Admin", email: adminEmail, role: "admin" },
      } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
