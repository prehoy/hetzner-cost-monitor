import { createRoute } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { priceOverrides } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pollOnce } from "../../methods/collector/start";
import { applyServerPricing } from "../../methods/costs/applyServerPricing";
import routeHandler from "../../methods/routeHandler";

// Remove a server's override — it reverts to the Hetzner list price.
async function overrideDelete(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { projectId?: number; hetznerId?: string };
  if (!body.projectId || !body.hetznerId) {
    return c.json({ error: "projectId and hetznerId required" }, 400);
  }
  await db
    .delete(priceOverrides)
    .where(
      and(
        eq(priceOverrides.projectId, body.projectId),
        eq(priceOverrides.hetznerId, body.hetznerId),
      ),
    );
  await applyServerPricing(body.projectId, body.hetznerId); // revert to list immediately
  pollOnce().catch(() => {});
  return c.json({ status: "success" });
}

const handler = (c: Context) =>
  routeHandler({ name: "pricing_override_delete", handler: overrideDelete, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Pricing"],
  path: "/api/pricing/override_delete",
  operationId: "pricingOverrideDelete",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { projectId: { type: "number" }, hetznerId: { type: "string" } },
            required: ["projectId", "hetznerId"],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Override removed",
      content: {
        "application/json": {
          schema: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
  },
});
