import { defineRoute, z } from "@prehoy/baguette";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { projects } from "../../db/schema";

export default defineRoute({
  method: "post",
  tags: ["Projects"],
  auth: true,
  request: {
    body: z.object({
      id: z.number().optional(),
      active: z.boolean().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
    if (!body.id || typeof body.active !== "boolean") {
      return c.json({ error: "Missing id or active" }, 400);
    }
    await db.update(projects).set({ active: body.active }).where(eq(projects.id, body.id));
    return c.json({ status: "success" });
  },
});
