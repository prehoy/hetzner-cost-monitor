import { defineRoute, z } from "@prehoy/baguette";
import { sql } from "drizzle-orm";
import db from "../../db/client";
import { users } from "../../db/schema";
import { createSession } from "../../methods/auth/session";

// First-admin registration. Blocked once any user exists (single-admin tool).
export default defineRoute({
  method: "post",
  tags: ["Authentication"],
  request: {
    body: z.object({
      email: z.string().optional(),
      password: z.string().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
    if (!body.email || !body.password) {
      return c.json({ error: "Missing email or password" }, 400);
    }
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    if (count > 0) {
      return c.json({ error: "Registration is closed — an admin already exists" }, 403);
    }
    const passwordHash = await Bun.password.hash(body.password, { algorithm: "bcrypt", cost: 10 });
    const [user] = await db
      .insert(users)
      .values({ email: body.email, passwordHash })
      .returning({ id: users.id, email: users.email });
    await createSession(c, user.id);
    return c.json({ status: "success", user });
  },
});
