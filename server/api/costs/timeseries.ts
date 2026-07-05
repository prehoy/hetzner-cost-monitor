import { defineRoute, z } from "@prehoy/baguette";
import { and, between, eq, sql } from "drizzle-orm";
import db from "../../db/client";
import { billingHours, projects } from "../../db/schema";
import { pricingMeta } from "../../methods/costs/meta";

// Accrued spend per hour bucket from the billing ledger. ?from&to (epoch ms),
// ?groupBy=category|location|project, optional ?projectId. Each hour's value is
// the Hetzner-billed cost (every resource seen that hour, billed a full hour).
// Reshaped into one series per group key (project -> name, not id).
export default defineRoute({
  method: "get",
  tags: ["Costs"],
  auth: true,
  request: {
    query: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      groupBy: z.string().optional(),
      projectId: z.string().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { query }) => {
    const now = Date.now();
    const from = new Date(Number(query.from ?? now - 7 * 864e5));
    const to = new Date(Number(query.to ?? now));
    const groupBy = query.groupBy ?? "category";
    const projectId = query.projectId;

    // Group key: project -> joined name (readable legend), else the column itself.
    const keyCol =
      groupBy === "project"
        ? sql<string>`coalesce(${projects.name}, 'project ' || ${billingHours.projectId})`
        : groupBy === "location"
          ? sql<string>`coalesce(${billingHours.location}, 'unknown')`
          : sql<string>`${billingHours.category}`;

    const where = projectId
      ? and(between(billingHours.hourStart, from, to), eq(billingHours.projectId, Number(projectId)))
      : between(billingHours.hourStart, from, to);

    const rows = await db
      .select({
        at: billingHours.hourStart,
        key: keyCol,
        cost: sql<number>`sum(${billingHours.hourlyCost})`,
      })
      .from(billingHours)
      .leftJoin(projects, eq(projects.id, billingHours.projectId))
      .where(where)
      .groupBy(billingHours.hourStart, keyCol)
      .orderBy(billingHours.hourStart);

    const series: Record<string, { at: number; cost: number }[]> = {};
    for (const r of rows) {
      const k = String(r.key ?? "unknown");
      (series[k] ??= []).push({ at: r.at.getTime(), cost: r.cost });
    }
    const meta = await pricingMeta();
    return c.json({
      ...meta,
      groupBy,
      series: Object.entries(series).map(([key, points]) => ({ key, points })),
    });
  },
});
