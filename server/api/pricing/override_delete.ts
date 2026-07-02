import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { priceOverrides } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pollOnce } from "../../methods/collector/start";
import routeHandler from "../../methods/routeHandler";

// Remove an override — the type reverts to the Hetzner list price.
async function overrideDelete(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { serverType?: string };
  if (!body.serverType) return c.json({ error: "serverType required" }, 400);
  await db.delete(priceOverrides).where(eq(priceOverrides.serverType, body.serverType));
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
            properties: { serverType: { type: "string" } },
            required: ["serverType"],
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
