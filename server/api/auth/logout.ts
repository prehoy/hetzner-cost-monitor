import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import db from "../../db/client";
import { sessions } from "../../db/schema";
import { tEnv } from "../../env";
import routeHandler from "../../methods/routeHandler";

async function logout(c: Context) {
  const token = getCookie(c, tEnv.AUTH_COOKIE_KEY);
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  deleteCookie(c, tEnv.AUTH_COOKIE_KEY, { path: "/" });
  return c.json({ status: "success" });
}

const handler = (c: Context) => routeHandler({ name: "auth_logout", handler: logout, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Authentication"],
  path: "/api/auth/logout",
  operationId: "authLogout",
  responses: {
    200: {
      description: "Logged out",
      content: {
        "application/json": {
          schema: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
  },
});
