import { defineRoute, z } from "@prehoy/baguette";
import { and, eq, isNull, sql } from "drizzle-orm";
import db from "../../db/client";
import { resources } from "../../db/schema";
import { pricingMeta } from "../../methods/costs/meta";

// Live inventory grouped for the explorer: rollups by category and by location,
// plus the flat resource list for the table. Optional ?projectId filter.
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
    const where = projectId
      ? and(isNull(resources.deletedAt), eq(resources.projectId, Number(projectId)))
      : isNull(resources.deletedAt);

    const grouped = (col: any) =>
      db
        .select({
          key: col,
          hourly: sql<number>`coalesce(sum(${resources.hourlyCost}), 0)`,
          monthly: sql<number>`coalesce(sum(${resources.monthlyCost}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(resources)
        .where(where)
        .groupBy(col);

    const [byCategory, byLocation, list] = await Promise.all([
      grouped(resources.category),
      grouped(resources.location),
      db
        .select({
          id: resources.id,
          projectId: resources.projectId,
          category: resources.category,
          name: resources.name,
          hetznerType: resources.hetznerType,
          location: resources.location,
          hourlyCost: resources.hourlyCost,
          monthlyCost: resources.monthlyCost,
        })
        .from(resources)
        .where(where),
      ]);

    const meta = await pricingMeta();
    return c.json({ ...meta, byCategory, byLocation, resources: list });
  },
});
