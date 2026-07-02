import { createRoute } from "@hono/zod-openapi";
import { between, sql } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { billingHours } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pricingMeta } from "../../methods/costs/meta";
import routeHandler from "../../methods/routeHandler";

const COLS = {
  category: billingHours.category,
  location: billingHours.location,
  project: billingHours.projectId,
} as const;

// Accrued spend per hour bucket from the billing ledger. ?from&to (epoch ms),
// ?groupBy=category|location|project. Each hour's value is the Hetzner-billed
// cost (every resource that appeared that hour, billed a full hour). Reshaped
// into one series per group key.
async function timeseries(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const now = Date.now();
  const from = new Date(Number(c.req.query("from") ?? now - 7 * 864e5));
  const to = new Date(Number(c.req.query("to") ?? now));
  const groupBy = (c.req.query("groupBy") ?? "category") as keyof typeof COLS;
  const col = COLS[groupBy] ?? billingHours.category;

  const rows = await db
    .select({
      at: billingHours.hourStart,
      key: col,
      cost: sql<number>`sum(${billingHours.hourlyCost})`,
    })
    .from(billingHours)
    .where(between(billingHours.hourStart, from, to))
    .groupBy(billingHours.hourStart, col)
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
