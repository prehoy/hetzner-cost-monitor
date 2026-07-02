import { createRoute } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { users } from "../../db/schema";
import { createSession } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

// First-admin registration. Blocked once any user exists (single-admin tool).
async function register(c: Context) {
  const body = (await c.req.json()) as { email?: string; password?: string };
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
}

const handler = (c: Context) => routeHandler({ name: "auth_register", handler: register, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Authentication"],
  path: "/api/auth/register",
  operationId: "authRegister",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { email: { type: "string" }, password: { type: "string" } },
            required: ["email", "password"],
          },
        },
      },
    },
  },
  responses: {
    500: ErrorSchema,
    200: {
      description: "Admin created and logged in",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: { type: "string" },
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
