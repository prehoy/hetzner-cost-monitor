import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import db from "../../db/client";
import { priceOverrides } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pollOnce } from "../../methods/collector/start";
import { applyServerPricing } from "../../methods/costs/applyServerPricing";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

// Pin the real NET price for one server (grandfathered/legacy pricing).
// hourlyCost defaults to monthlyCost / 730 if omitted.
async function overrideSet(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as {
    projectId?: number;
    hetznerId?: string;
    monthlyCost?: number;
    hourlyCost?: number;
  };
  if (!body.projectId || !body.hetznerId || body.monthlyCost == null || body.monthlyCost < 0) {
    return c.json({ error: "projectId, hetznerId and a non-negative monthlyCost are required" }, 400);
  }
  const hourlyCost = body.hourlyCost != null ? body.hourlyCost : body.monthlyCost / 730;
  await db
    .insert(priceOverrides)
    .values({
      projectId: body.projectId,
      hetznerId: body.hetznerId,
      monthlyCost: body.monthlyCost,
      hourlyCost,
    })
    .onConflictDoUpdate({
      target: [priceOverrides.projectId, priceOverrides.hetznerId],
      set: { monthlyCost: body.monthlyCost, hourlyCost },
    });
  await applyServerPricing(body.projectId, body.hetznerId); // reflect immediately
  pollOnce().catch(() => {});
  return c.json({ status: "success" });
}

const handler = (c: Context) => routeHandler({ name: "pricing_override_set", handler: overrideSet, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Pricing"],
  path: "/api/pricing/override_set",
  operationId: "pricingOverrideSet",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              projectId: { type: "number" },
              hetznerId: { type: "string" },
              monthlyCost: { type: "number" },
              hourlyCost: { type: "number" },
            },
            required: ["projectId", "hetznerId", "monthlyCost"],
          },
        },
      },
    },
  },
  responses: {
    500: ErrorSchema,
    200: {
      description: "Override saved",
      content: {
        "application/json": {
          schema: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
  },
});
