import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { users } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

async function me(c: Context) {
  const session = await requireAuth(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { id: true, email: true, createdAt: true },
  });
  return c.json({ user });
}

const handler = (c: Context) => routeHandler({ name: "auth_me", handler: me, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Authentication"],
  path: "/api/auth/me",
  operationId: "authMe",
  responses: {
    200: {
      description: "Current user",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: { id: { type: "number" }, email: { type: "string" } },
              },
            },
          },
        },
      },
    },
  },
});
