import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import db from "../../db/client";
import { projects } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { pollOnce } from "../../methods/collector/start";
import { encrypt } from "../../methods/crypto";
import { hetznerGet } from "../../methods/hetzner/client";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

async function create(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { name?: string; token?: string };
  if (!body.name || !body.token) return c.json({ error: "Missing name or token" }, 400);

  // Validate the token against Hetzner before storing it.
  try {
    await hetznerGet(body.token, "/servers?per_page=1");
  } catch {
    return c.json({ error: "Token rejected by Hetzner API" }, 400);
  }

  const { ciphertext, iv } = encrypt(body.token);
  const [project] = await db
    .insert(projects)
    .values({ name: body.name, tokenEncrypted: ciphertext, tokenIv: iv })
    .returning({ id: projects.id, name: projects.name });

  // Fire a poll so data shows up without waiting for the next tick.
  pollOnce().catch(() => {});
  return c.json({ status: "success", project });
}

const handler = (c: Context) => routeHandler({ name: "projects_create", handler: create, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Projects"],
  path: "/api/projects/create",
  operationId: "projectsCreate",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { name: { type: "string" }, token: { type: "string" } },
            required: ["name", "token"],
          },
        },
      },
    },
  },
  responses: {
    500: ErrorSchema,
    200: {
      description: "Project added",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: { type: "string" },
              project: {
                type: "object",
                properties: { id: { type: "number" }, name: { type: "string" } },
              },
            },
          },
        },
      },
    },
  },
});
