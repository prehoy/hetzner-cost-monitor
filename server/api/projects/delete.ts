import { defineRoute, z } from "@prehoy/baguette";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { projects, resources } from "../../db/schema";

export default defineRoute({
  method: "post",
  tags: ["Projects"],
  auth: true,
  request: {
    body: z.object({
      id: z.number().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
    if (!body.id) return c.json({ error: "Missing id" }, 400);
    await db.delete(resources).where(eq(resources.projectId, body.id));
    await db.delete(projects).where(eq(projects.id, body.id));
    return c.json({ status: "success" });
  },
});
