import { createRoute } from "@hono/zod-openapi";
import { eq, gte, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { billingHours, projects, resources } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pricingMeta } from "../../methods/costs/meta";
import routeHandler from "../../methods/routeHandler";

// Current burn (live inventory) + month-to-date accrued (billing ledger). All NET.
async function summary(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
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
    .where(isNull(resources.deletedAt))
    .groupBy(resources.projectId, projects.name);

  const totalHourly = rows.reduce((s, r) => s + r.hourly, 0);
  const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0);

  // Month-to-date: sum every billed hour since the 1st (UTC). Accurate for
  // ephemeral/burst servers — each counts as a full billed hour.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [mtd] = await db
    .select({ total: sql<number>`coalesce(sum(${billingHours.hourlyCost}), 0)` })
    .from(billingHours)
    .where(gte(billingHours.hourStart, monthStart));

  const meta = await pricingMeta();
  return c.json({ ...meta, totalHourly, totalMonthly, mtdAccrued: mtd.total, perProject: rows });
}

const handler = (c: Context) => routeHandler({ name: "costs_summary", handler: summary, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Costs"],
  path: "/api/costs/summary",
  operationId: "costsSummary",
  responses: {
    200: {
      description: "Current cost summary",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              currency: { type: "string" },
              vatRate: { type: "number" },
              totalHourly: { type: "number" },
              totalMonthly: { type: "number" },
              mtdAccrued: { type: "number" },
              perProject: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    projectId: { type: "number" },
                    name: { type: "string", nullable: true },
                    hourly: { type: "number" },
                    monthly: { type: "number" },
                    resourceCount: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
