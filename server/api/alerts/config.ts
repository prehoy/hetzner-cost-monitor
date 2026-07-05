import { defineRoute, z } from "@prehoy/baguette";
import db from "../../db/client";
import { pricingMeta } from "../../methods/costs/meta";

// The current (single) spend-alert rule, or null if unconfigured. `currency` lets
// the UI label the threshold correctly for non-EUR rate cards.
export default defineRoute({
  method: "get",
  tags: ["Alerts"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
    const config = await db.query.alertConfig.findFirst();
    const { currency } = await pricingMeta();
    return c.json({ currency, config: config ?? null });
  },
});
