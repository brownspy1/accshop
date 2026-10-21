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
import {
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  generateAdminPasskeyRegistrationOptions,
  verifyAndSaveAdminPasskeyRegistration,
  generateAdminPasskeyAuthOptions,
  verifyAdminPasskeyAuth,
  listAdminPasskeys,
  deleteAdminPasskey,
} from "./passkeyAuth";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, adminProcedure, router } from "./_core/trpc";
import { shopRouter } from "./shopRouter";
import { customerAccountRouter } from "./customerRouter";
import {
  findAdminByUsernameOrEmail,
  listAllAdminUsers,
  createAdminUser,
  deleteAdminUser,
  markAdminSignedIn,
  ensureDefaultAdminExists,
} from "./adminUsersAuth";

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
      const clientIp = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.ip || "unknown";
      try {
        checkLoginRateLimit(clientIp);
      } catch (rateErr: any) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: rateErr.message });
      }

      await ensureDefaultAdminExists();

      const candidateUser = input.username?.trim();
      let matchedAdmin: { id: number; username: string; email: string; name: string | null } | null = null;
      let matched = false;

      if (candidateUser) {
        // STRICT LOOKUP: Candidate username or email MUST match a registered admin!
        const found = await findAdminByUsernameOrEmail(candidateUser);
        if (!found) {
          // Unknown username - REJECT IMMEDIATELY without checking any fallback secret!
          recordFailedLogin(clientIp);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ইউজারনেম বা পাসওয়ার্ড সঠিক নয়। শুধুমাত্র রেজিস্টার্ড অ্যাডমিন প্রবেশ করতে পারবেন।"
          });
        }

        // Verify password against THIS specific admin's scrypt hash
        if (verifyAdminPassword(input.password.trim(), found.passwordHash, found.passwordSalt)) {
          matched = true;
          matchedAdmin = found;
        }
      } else {
        // Fallback for automated tests or legacy single-field input without username:
        const admins = await listAllAdminUsers();
        if (admins.length > 0) {
          const primary = await findAdminByUsernameOrEmail(admins[0].username);
          if (primary && verifyAdminPassword(input.password.trim(), primary.passwordHash, primary.passwordSalt)) {
            matched = true;
            matchedAdmin = primary;
          }
        }
        // Environment fallback only if no custom password matched and no username was provided
        if (!matched && verifyFallbackAdminSecret(input.password.trim())) {
          matched = true;
        }
      }

      if (!matched) {
        recordFailedLogin(clientIp);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin password বা secret key সঠিক নয়।" });
      }

      recordSuccessfulLogin(clientIp);

      const activeAdminUsername = matchedAdmin?.username || matchedAdmin?.name || "Store Admin";
      const activeAdminEmail = matchedAdmin?.email || process.env.ACCZONE_ADMIN_EMAIL?.trim() || "admin@acczone.shop";

      if (matchedAdmin) {
        await markAdminSignedIn(matchedAdmin.id);
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

    // --- Registered Admin Users Management ---
    adminUsers: router({
      list: adminProcedure.query(async () => {
        return await listAllAdminUsers();
      }),
      create: adminProcedure.input(z.object({
        username: z.string().trim().min(2, "ইউজারনেম কমপক্ষে ২ অক্ষরের হতে হবে").max(64),
        email: z.string().trim().email("সঠিক ইমেইল ঠিকানা দিন").max(320),
        password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে").max(128),
        role: z.enum(["admin", "superadmin"]).default("admin"),
        name: z.string().trim().max(128).optional(),
      })).mutation(async ({ input }) => {
        const user = await createAdminUser(input);
        return {
          success: true,
          user,
          message: `@${user.username} অ্যাডমিন সফলভাবে তৈরি হয়েছে!`,
        };
      }),
      delete: adminProcedure.input(z.object({
        id: z.number().int().positive(),
      })).mutation(async ({ input, ctx }) => {
        await deleteAdminUser(input.id, ctx.user.email || "");
        return {
          success: true,
          message: "অ্যাডমিন একাউন্টটি সফলভাবে মুছে ফেলা হয়েছে।",
        };
      }),
    }),

    // --- WebAuthn / Passkey Biometric Admin Security ---
    hasPasskeys: publicProcedure.query(async () => {
      const keys = await listAdminPasskeys();
      return { count: keys.length, hasPasskeys: keys.length > 0 };
    }),

    passkeyAuthOptions: publicProcedure.mutation(async ({ ctx }) => {
      const host = ctx.req.headers.host;
      const origin = ctx.req.headers.origin;
      try {
        return await generateAdminPasskeyAuthOptions(host, origin);
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
      }
    }),

    passkeyVerifyAuth: publicProcedure.input(z.object({
      response: z.any(),
    })).mutation(async ({ input, ctx }) => {
      const clientIp = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.ip || "unknown";
      const host = ctx.req.headers.host;
      const origin = ctx.req.headers.origin;

      let result;
      try {
        result = await verifyAdminPasskeyAuth(input.response, clientIp, host, origin);
      } catch (err: any) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
      }

      // Establish admin session
      const database = await getDb();
      let activeAdminUsername = "Store Admin";
      let activeAdminEmail = process.env.ACCZONE_ADMIN_EMAIL?.trim() || "admin@acczone.shop";

      if (database) {
        try {
          const [s] = await database.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
          if (s) {
            if (s.adminUsername) activeAdminUsername = s.adminUsername;
            if (s.adminEmail) activeAdminEmail = s.adminEmail;
          }
        } catch {}
      }

      setDynamicAdminEmail(activeAdminEmail);
      const adminOpenId = `admin_${createHash("sha256").update(activeAdminEmail).digest("hex").slice(0, 16)}`;

      try {
        await db.upsertUser({
          openId: adminOpenId,
          name: activeAdminUsername,
          email: activeAdminEmail,
          loginMethod: "passkey",
          role: "admin",
          lastSignedIn: new Date(),
        });
      } catch (e) {
        console.warn("[Auth] Could not upsert passkey admin into DB:", e);
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
      };
    }),

    passkeyRegisterOptions: publicProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin authentication required" });
      }
      const host = ctx.req.headers.host;
      const origin = ctx.req.headers.origin;
      try {
        return await generateAdminPasskeyRegistrationOptions(ctx.user, host, origin);
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
      }
    }),

    passkeyVerifyRegister: publicProcedure.input(z.object({
      response: z.any(),
      name: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin authentication required" });
      }
      const host = ctx.req.headers.host;
      const origin = ctx.req.headers.origin;
      try {
        return await verifyAndSaveAdminPasskeyRegistration(input.response, input.name || "Passkey", host, origin);
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
      }
    }),

    passkeyList: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin authentication required" });
      }
      return await listAdminPasskeys();
    }),

    passkeyDelete: publicProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input, ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin authentication required" });
      }
      return await deleteAdminPasskey(input.id);
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
