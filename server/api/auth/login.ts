import { defineRoute, z } from "@prehoy/baguette";
import { eq } from "drizzle-orm";
import db from "../../db/client";
import { users } from "../../db/schema";
import { createSession } from "../../methods/auth/session";

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
    const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (!user) return c.json({ error: "Invalid credentials" }, 401);
    const valid = await Bun.password.verify(body.password, user.passwordHash, "bcrypt");
    if (!valid) return c.json({ error: "Invalid credentials" }, 401);
    await createSession(c, user.id);
    return c.json({ status: "success", user: { id: user.id, email: user.email } });
  },
});
