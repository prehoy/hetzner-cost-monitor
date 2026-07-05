import { defineRoute, z } from "@prehoy/baguette";
import { eq } from "drizzle-orm";
import { deleteCookie, getCookie } from "hono/cookie";
import db from "../../db/client";
import { sessions } from "../../db/schema";
import { tEnv } from "../../env";

export default defineRoute({
  method: "post",
  tags: ["Authentication"],
  response: z.any(),
  handler: async (c) => {
    const token = getCookie(c, tEnv.AUTH_COOKIE_KEY);
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    deleteCookie(c, tEnv.AUTH_COOKIE_KEY, { path: "/" });
    return c.json({ status: "success" });
  },
});
