import { createRoute } from "@hono/zod-openapi";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { resources } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pricingMeta } from "../../methods/costs/meta";
import routeHandler from "../../methods/routeHandler";

// Live inventory grouped for the explorer: rollups by category and by location,
// plus the flat resource list for the table. Optional ?projectId filter.
async function breakdown(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.query("projectId");
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
}

const handler = (c: Context) => routeHandler({ name: "costs_breakdown", handler: breakdown, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Costs"],
  path: "/api/costs/breakdown",
  operationId: "costsBreakdown",
  description: "Optional query param: projectId (filters to one project).",
  responses: {
    200: {
      description: "Cost breakdown",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              currency: { type: "string" },
              vatRate: { type: "number" },
              byCategory: { type: "array", items: { type: "object" } },
              byLocation: { type: "array", items: { type: "object" } },
              resources: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
  },
});
