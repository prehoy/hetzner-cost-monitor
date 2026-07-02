import { createRoute } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { users } from "../../db/schema";
import { getSession } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

// Public: tells the frontend whether first-run setup is needed and whether the
// current cookie is authenticated. Drives login vs register routing.
async function status(c: Context) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const session = await getSession(c);
  return c.json({ setupRequired: count === 0, authenticated: !!session });
}

const handler = (c: Context) => routeHandler({ name: "auth_status", handler: status, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Authentication"],
  path: "/api/auth/status",
  operationId: "authStatus",
  responses: {
    200: {
      description: "Setup and auth state",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              setupRequired: { type: "boolean" },
              authenticated: { type: "boolean" },
            },
            required: ["setupRequired", "authenticated"],
          },
        },
      },
    },
  },
});
