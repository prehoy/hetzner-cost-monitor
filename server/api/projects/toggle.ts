import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import db from "../../db/client";
import { projects } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

async function toggle(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { id?: number; active?: boolean };
  if (!body.id || typeof body.active !== "boolean") {
    return c.json({ error: "Missing id or active" }, 400);
  }
  await db.update(projects).set({ active: body.active }).where(eq(projects.id, body.id));
  return c.json({ status: "success" });
}

const handler = (c: Context) => routeHandler({ name: "projects_toggle", handler: toggle, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Projects"],
  path: "/api/projects/toggle",
  operationId: "projectsToggle",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { id: { type: "number" }, active: { type: "boolean" } },
            required: ["id", "active"],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Toggled",
      content: {
        "application/json": {
          schema: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
  },
});
