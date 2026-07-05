import { defineRoute, z } from "@prehoy/baguette";
import db from "../../db/client";
import { priceOverrides } from "../../db/schema";
import { pollOnce } from "../../methods/collector/start";
import { applyServerPricing } from "../../methods/costs/applyServerPricing";

// Pin the real NET price for one server (grandfathered/legacy pricing).
// hourlyCost defaults to monthlyCost / 730 if omitted.
export default defineRoute({
  method: "post",
  tags: ["Pricing"],
  auth: true,
  request: {
    body: z.object({
      projectId: z.number().optional(),
      hetznerId: z.string().optional(),
      monthlyCost: z.number().optional(),
      hourlyCost: z.number().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
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
  },
});
