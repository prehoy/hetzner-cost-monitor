import { createRoute } from "@hono/zod-openapi";
import { and, between, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { billingHours, projects } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pricingMeta } from "../../methods/costs/meta";
import routeHandler from "../../methods/routeHandler";

// Accrued spend per hour bucket from the billing ledger. ?from&to (epoch ms),
// ?groupBy=category|location|project, optional ?projectId. Each hour's value is
// the Hetzner-billed cost (every resource seen that hour, billed a full hour).
// Reshaped into one series per group key (project -> name, not id).
async function timeseries(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const now = Date.now();
  const from = new Date(Number(c.req.query("from") ?? now - 7 * 864e5));
  const to = new Date(Number(c.req.query("to") ?? now));
  const groupBy = c.req.query("groupBy") ?? "category";
  const projectId = c.req.query("projectId");

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
}

const handler = (c: Context) => routeHandler({ name: "costs_timeseries", handler: timeseries, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Costs"],
  path: "/api/costs/timeseries",
  operationId: "costsTimeseries",
  description: "Query params: from & to (epoch ms), groupBy=category|location|project.",
  responses: {
    200: {
      description: "Cost time-series grouped by the requested dimension",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              currency: { type: "string" },
              vatRate: { type: "number" },
              groupBy: { type: "string" },
              series: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    points: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          at: { type: "number" },
                          cost: { type: "number" },
                        },
                      },
                    },
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
