import { createRoute } from "@hono/zod-openapi";
import { desc } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { pricingSnapshots } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

// Latest raw Hetzner rate card (for a "rates" reference view in the UI).
async function current(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const latest = await db.query.pricingSnapshots.findFirst({
    orderBy: desc(pricingSnapshots.fetchedAt),
  });
  if (!latest) return c.json({ pricing: null });
  return c.json({ fetchedAt: latest.fetchedAt, pricing: JSON.parse(latest.dataJson) });
}

const handler = (c: Context) => routeHandler({ name: "pricing_current", handler: current, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Pricing"],
  path: "/api/pricing/current",
  operationId: "pricingCurrent",
  responses: {
    200: {
      description: "Current rate card",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { fetchedAt: { type: "string" }, pricing: { type: "object" } },
          },
        },
      },
    },
  },
});
