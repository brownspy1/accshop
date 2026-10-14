import { createHash, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { storeSettings } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { setDynamicAdminEmail } from "./_core/adminAllowlist";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { getDb } from "./db";
import { verifyAdminPassword, verifyFallbackAdminSecret } from "./adminAuth";
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
      username: z.string().trim().max(128).optional(),
      password: z.string().min(1, "Password is required"),
    })).mutation(async ({ input, ctx }) => {
      const database = await getDb();
      let matched = false;
      let activeAdminUsername = "Store Admin";
      let activeAdminEmail = process.env.ACCZONE_ADMIN_EMAIL?.trim() || "admin@acczone.shop";

      if (database) {
        try {
          const [s] = await database.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
          if (s) {
            if (s.adminUsername) activeAdminUsername = s.adminUsername;
            if (s.adminEmail) activeAdminEmail = s.adminEmail;

            if (s.adminPasswordHash && s.adminPasswordSalt) {
              const pwMatches = verifyAdminPassword(input.password.trim(), s.adminPasswordHash, s.adminPasswordSalt);
              if (pwMatches) {
                if (input.username?.trim()) {
                  const candidateUser = input.username.trim().toLowerCase();
                  if (
                    candidateUser === (s.adminUsername || "admin").toLowerCase() ||
                    candidateUser === (s.adminEmail || "").toLowerCase() ||
                    candidateUser === "admin"
                  ) {
                    matched = true;
                  }
                } else {
                  matched = true;
                }
              }
            }
          }
        } catch (e) {
          console.warn("[Auth] Error reading storeSettings for admin login:", e);
        }
      }

      // If not matched by database password hash, fallback to environment secret
      if (!matched) {
        matched = verifyFallbackAdminSecret(input.password.trim());
      }

      if (!matched) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin password বা secret key সঠিক নয়।" });
      }

      setDynamicAdminEmail(activeAdminEmail);
      const adminOpenId = `admin_${createHash("sha256").update(activeAdminEmail).digest("hex").slice(0, 16)}`;

      try {
        await db.upsertUser({
          openId: adminOpenId,
          name: activeAdminUsername,
          email: activeAdminEmail,
          loginMethod: "key",
          role: "admin",
          lastSignedIn: new Date(),
        });
      } catch (e) {
        console.warn("[Auth] Could not upsert admin user into DB:", e);
      }

      const adminSessionMs = 7 * 24 * 60 * 60 * 1000;
      const sessionToken = await sdk.createSessionToken(adminOpenId, {
        name: activeAdminUsername,
        expiresInMs: adminSessionMs,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: adminSessionMs });

      return {
        success: true,
        user: { openId: adminOpenId, name: activeAdminUsername, email: activeAdminEmail, role: "admin" },
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
