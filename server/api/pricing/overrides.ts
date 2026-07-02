import { createRoute } from "@hono/zod-openapi";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { priceOverrides, pricingSnapshots, projects, resources } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

// Every live server with its Hetzner list price and any per-resource override.
// Grandfathering is per-instance, so pricing is set per server, not per type.
async function overrides(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);

  const servers = await db
    .select({
      projectId: resources.projectId,
      hetznerId: resources.hetznerId,
      name: resources.name,
      hetznerType: resources.hetznerType,
      location: resources.location,
      currentMonthly: resources.monthlyCost,
      currentHourly: resources.hourlyCost,
    })
    .from(resources)
    .where(and(eq(resources.category, "server"), isNull(resources.deletedAt)));

  const projRows = await db.select({ id: projects.id, name: projects.name }).from(projects);
  const projName = new Map(projRows.map((p) => [p.id, p.name]));

  const snap = await db.query.pricingSnapshots.findFirst({
    orderBy: desc(pricingSnapshots.fetchedAt),
  });
  const pricing = snap ? JSON.parse(snap.dataJson) : { server_types: [] };
  const ovs = await db.select().from(priceOverrides);
  const ovMap = new Map(ovs.map((o) => [`${o.projectId}:${o.hetznerId}`, o]));

  const list = servers
    .map((s) => {
      const st = pricing.server_types?.find((x: any) => x.name === s.hetznerType);
      const lp = st?.prices?.find((p: any) => p.location === s.location) ?? st?.prices?.[0];
      const ov = ovMap.get(`${s.projectId}:${s.hetznerId}`);
      return {
        ...s,
        projectName: projName.get(s.projectId) ?? `project ${s.projectId}`,
        listMonthly: parseFloat(lp?.price_monthly?.net ?? "0"),
        listHourly: parseFloat(lp?.price_hourly?.net ?? "0"),
        overrideMonthly: ov?.monthlyCost ?? null,
        overrideHourly: ov?.hourlyCost ?? null,
      };
    })
    .sort((a, b) => b.currentMonthly - a.currentMonthly);

  return c.json({ currency: pricing.currency ?? "EUR", servers: list });
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
      description: "Live servers with list price and any per-resource override",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              currency: { type: "string" },
              servers: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
});
