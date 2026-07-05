import { defineRoute, z } from "@prehoy/baguette";
import { desc } from "drizzle-orm";
import db from "../../db/client";
import { pricingSnapshots } from "../../db/schema";

// Latest raw Hetzner rate card (for a "rates" reference view in the UI).
export default defineRoute({
  method: "get",
  tags: ["Pricing"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
    const latest = await db.query.pricingSnapshots.findFirst({
      orderBy: desc(pricingSnapshots.fetchedAt),
    });
    if (!latest) return c.json({ pricing: null });
    return c.json({ fetchedAt: latest.fetchedAt, pricing: JSON.parse(latest.dataJson) });
  },
});
