import { defineRoute, z } from "@prehoy/baguette";
import { and, eq } from "drizzle-orm";
import db from "../../db/client";
import { priceOverrides } from "../../db/schema";
import { pollOnce } from "../../methods/collector/start";
import { applyServerPricing } from "../../methods/costs/applyServerPricing";

// Remove a server's override — it reverts to the Hetzner list price.
export default defineRoute({
  method: "post",
  tags: ["Pricing"],
  auth: true,
  request: {
    body: z.object({
      projectId: z.number().optional(),
      hetznerId: z.string().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
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
  },
});
