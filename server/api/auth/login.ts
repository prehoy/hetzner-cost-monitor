import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { users } from "../../db/schema";
import { createSession } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

async function login(c: Context) {
  const body = (await c.req.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return c.json({ error: "Missing email or password" }, 400);
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  if (!user) return c.json({ error: "Invalid credentials" }, 401);
  const valid = await Bun.password.verify(body.password, user.passwordHash, "bcrypt");
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);
  await createSession(c, user.id);
  return c.json({ status: "success", user: { id: user.id, email: user.email } });
}

const handler = (c: Context) => routeHandler({ name: "auth_login", handler: login, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Authentication"],
  path: "/api/auth/login",
  operationId: "authLogin",
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
      description: "Logged in",
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
