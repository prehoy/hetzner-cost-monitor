import { defineRoute, z } from "@prehoy/baguette";
import db from "../../db/client";

// Never returns the token — only safe metadata.
export default defineRoute({
  method: "get",
  tags: ["Projects"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
    const rows = await db.query.projects.findMany({
      columns: {
        id: true,
        name: true,
        active: true,
        lastPollAt: true,
        lastPollError: true,
        createdAt: true,
      },
    });
    return c.json({ projects: rows });
  },
});
