import { defineRoute, z } from "@prehoy/baguette";
import { and, desc, eq, isNull } from "drizzle-orm";
import db from "../../db/client";
import { priceOverrides, pricingSnapshots, projects, resources } from "../../db/schema";

// Every live server with its Hetzner list price and any per-resource override.
// Grandfathering is per-instance, so pricing is set per server, not per type.
export default defineRoute({
  method: "get",
  tags: ["Pricing"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
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
  },
});
