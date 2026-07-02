import { createRoute } from "@hono/zod-openapi";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { priceOverrides, pricingSnapshots, resources } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

// Server types currently in inventory, each with its Hetzner list price (from
// the rate card), how many run, and any manual override. Drives the pricing UI.
async function overrides(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);

  const inUse = await db
    .select({
      serverType: resources.hetznerType,
      location: sql<string>`max(${resources.location})`,
      count: sql<number>`count(*)`,
    })
    .from(resources)
    .where(and(eq(resources.category, "server"), isNull(resources.deletedAt)))
    .groupBy(resources.hetznerType);

  const snap = await db.query.pricingSnapshots.findFirst({
    orderBy: desc(pricingSnapshots.fetchedAt),
  });
  const pricing = snap ? JSON.parse(snap.dataJson) : { server_types: [] };
  const ovs = await db.select().from(priceOverrides);
  const ovMap = new Map(ovs.map((o) => [o.serverType, o]));

  const types = inUse
    .filter((t) => t.serverType)
    .map((t) => {
      const st = pricing.server_types?.find((s: any) => s.name === t.serverType);
      const lp = st?.prices?.find((p: any) => p.location === t.location) ?? st?.prices?.[0];
      const ov = ovMap.get(t.serverType!);
      return {
        serverType: t.serverType,
        location: t.location,
        count: t.count,
        listMonthly: parseFloat(lp?.price_monthly?.net ?? "0"),
        listHourly: parseFloat(lp?.price_hourly?.net ?? "0"),
        overrideMonthly: ov?.monthlyCost ?? null,
        overrideHourly: ov?.hourlyCost ?? null,
      };
    })
    .sort((a, b) => b.listMonthly - a.listMonthly);

  return c.json({ currency: pricing.currency ?? "EUR", types });
}

const handler = (c: Context) => routeHandler({ name: "pricing_overrides", handler: overrides, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Pricing"],
  path: "/api/pricing/overrides",
  operationId: "pricingOverrides",
  responses: {
    200: {
      description: "Server types in use with list price and any override",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              currency: { type: "string" },
              types: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
});
