import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { TRPCError, initTRPC } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { customerAccounts } from "../../drizzle/schema";
import { getDb } from "../db";
import { parseCustomerSessionCookie } from "../customerAuth";
import { isAdminEmail } from "./adminAllowlist";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });
export const router = t.router;
export const publicProcedure = t.procedure;

function assertSameOriginJson(req: TrpcContext["req"]) {
  const fetchSiteHeader = req.headers["sec-fetch-site"];
  const fetchSite = Array.isArray(fetchSiteHeader) ? fetchSiteHeader[0] : fetchSiteHeader;
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const forwardedHost = req.headers["x-forwarded-host"];
  const allowedHosts = [req.headers.host, forwardedHost]
    .flatMap(value => Array.isArray(value) ? value : [value])
    .flatMap(value => (value ?? "").split(","))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  if (fetchSite === "cross-site" || !req.is("application/json")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cross-site changes are not allowed." });
  }
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host.toLowerCase(); } catch { /* invalid origin */ }
    if (!originHost || !allowedHosts.includes(originHost)) throw new TRPCError({ code: "FORBIDDEN", message: "Request origin did not match this site." });
  } else if (fetchSite !== "same-origin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "An authenticated same-origin request is required." });
  }
}

export const sameOriginProcedure = t.procedure.use(t.middleware(async ({ ctx, next }) => {
  assertSameOriginJson(ctx.req);
  return next();
}));

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || ctx.user.role !== 'admin' || !isAdminEmail(ctx.user.email)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  if (opts.type === "mutation") assertSameOriginJson(ctx.req);
  return next({ ctx: { ...ctx, user: ctx.user } });
}));

export const customerProcedure = t.procedure.use(t.middleware(async ({ ctx, next, type }) => {
  if (type === "mutation") assertSameOriginJson(ctx.req);
  const cookieHeader = ctx.req.headers.cookie;
  const customerId = parseCustomerSessionCookie(Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader);
  if (!customerId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Customer account sign-in required." });
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
  const [customer] = await db.select().from(customerAccounts).where(eq(customerAccounts.id, customerId)).limit(1);
  if (!customer?.emailVerifiedAt) throw new TRPCError({ code: "UNAUTHORIZED", message: "Verified customer account sign-in required." });
  return next({ ctx: { ...ctx, customer } });
}));
