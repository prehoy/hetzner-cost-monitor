import { defineRoute, z } from "@prehoy/baguette";
import { pricingMeta } from "../../methods/costs/meta";
import { detectWaste } from "../../methods/waste/detect";

// Reclaimable spend: idle/unattached resources in the live inventory. Advisory
// only — we never touch infra (read-only token).
export default defineRoute({
  method: "get",
  tags: ["Savings"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
    const { findings, total } = await detectWaste();
    const { currency } = await pricingMeta();
    return c.json({ currency, total, findings });
  },
});
