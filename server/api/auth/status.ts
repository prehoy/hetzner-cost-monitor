import { defineRoute, z } from "@prehoy/baguette";
import { sql } from "drizzle-orm";
import db from "../../db/client";
import { users } from "../../db/schema";
import { getSession } from "../../methods/auth/session";

// Public: tells the frontend whether first-run setup is needed and whether the
// current cookie is authenticated. Drives login vs register routing.
export default defineRoute({
  method: "get",
  tags: ["Authentication"],
  response: z.any(),
  handler: async (c) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const session = await getSession(c);
    return c.json({ setupRequired: count === 0, authenticated: !!session });
  },
});
