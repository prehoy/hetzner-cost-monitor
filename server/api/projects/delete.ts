import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { projects, resources } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

async function remove(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { id?: number };
  if (!body.id) return c.json({ error: "Missing id" }, 400);
  await db.delete(resources).where(eq(resources.projectId, body.id));
  await db.delete(projects).where(eq(projects.id, body.id));
  return c.json({ status: "success" });
}

const handler = (c: Context) => routeHandler({ name: "projects_delete", handler: remove, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Projects"],
  path: "/api/projects/delete",
  operationId: "projectsDelete",
  request: {
    body: {
      content: {
        "application/json": {
          schema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Deleted",
      content: {
        "application/json": {
          schema: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
  },
});
