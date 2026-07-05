import { defineRoute, z } from "@prehoy/baguette";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import db from "../../db/client";
import { billingHours, projects, resources } from "../../db/schema";
import { pricingMeta } from "../../methods/costs/meta";

// Current burn (live inventory) + month-to-date accrued (billing ledger). All NET.
// Optional ?projectId scopes every figure to one project.
export default defineRoute({
  method: "get",
  tags: ["Costs"],
  auth: true,
  request: {
    query: z.object({ projectId: z.string().optional() }),
  },
  response: z.any(),
  handler: async (c, { query }) => {
    const projectId = query.projectId;
    const pid = projectId ? Number(projectId) : undefined;

    const liveWhere = pid
      ? and(isNull(resources.deletedAt), eq(resources.projectId, pid))
      : isNull(resources.deletedAt);

    const rows = await db
      .select({
        projectId: resources.projectId,
        name: projects.name,
        hourly: sql<number>`coalesce(sum(${resources.hourlyCost}), 0)`,
        monthly: sql<number>`coalesce(sum(${resources.monthlyCost}), 0)`,
        resourceCount: sql<number>`count(*)`,
      })
      .from(resources)
      .leftJoin(projects, eq(projects.id, resources.projectId))
      .where(liveWhere)
      .groupBy(resources.projectId, projects.name);

    const totalHourly = rows.reduce((s, r) => s + r.hourly, 0);
    const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0);

    // Month-to-date: sum every billed hour since the 1st (UTC). Accurate for
    // ephemeral/burst servers — each counts as a full billed hour.
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const mtdWhere = pid
      ? and(gte(billingHours.hourStart, monthStart), eq(billingHours.projectId, pid))
      : gte(billingHours.hourStart, monthStart);
    const [mtd] = await db
      .select({ total: sql<number>`coalesce(sum(${billingHours.hourlyCost}), 0)` })
      .from(billingHours)
      .where(mtdWhere);

    const meta = await pricingMeta();
    return c.json({ ...meta, totalHourly, totalMonthly, mtdAccrued: mtd.total, perProject: rows });
  },
});
