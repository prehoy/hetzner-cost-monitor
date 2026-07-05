import { defineRoute, z } from "@prehoy/baguette";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { users } from "../../db/schema";

export default defineRoute({
  method: "get",
  tags: ["Authentication"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
    const session = c.get("user");
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      columns: { id: true, email: true, createdAt: true },
    });
    return c.json({ user });
  },
});
