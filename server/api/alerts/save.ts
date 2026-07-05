import { defineRoute, z } from "@prehoy/baguette";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { alertConfig } from "../../db/schema";

// Upsert the single spend rule. Changing it re-arms (`triggered=false`) so the
// next breach notifies even if it was already in breach under the old config.
export default defineRoute({
  method: "post",
  tags: ["Alerts"],
  auth: true,
  request: {
    body: z.object({
      webhookUrl: z.string().url(),
      threshold: z.number().positive(),
      enabled: z.boolean().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
    const values = {
      webhookUrl: body.webhookUrl,
      threshold: body.threshold,
      enabled: body.enabled ?? true,
      triggered: false,
      updatedAt: new Date(),
    };
    const existing = await db.query.alertConfig.findFirst();
    if (existing) {
      await db.update(alertConfig).set(values).where(eq(alertConfig.id, existing.id));
    } else {
      await db.insert(alertConfig).values(values);
    }
    const config = await db.query.alertConfig.findFirst();
    return c.json({ status: "success", config });
  },
});
