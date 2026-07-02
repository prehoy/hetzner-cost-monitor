import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import db from "../../db/client";
import { projects } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

// Never returns the token — only safe metadata.
async function list(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const rows = await db.query.projects.findMany({
    columns: {
      id: true,
      name: true,
      active: true,
      lastPollAt: true,
      lastPollError: true,
      createdAt: true,
    },
  });
  return c.json({ projects: rows });
}

const handler = (c: Context) => routeHandler({ name: "projects_list", handler: list, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Projects"],
  path: "/api/projects/list",
  operationId: "projectsList",
  responses: {
    200: {
      description: "Projects",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              projects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    name: { type: "string" },
                    active: { type: "boolean" },
                    lastPollAt: { type: "string", nullable: true },
                    lastPollError: { type: "string", nullable: true },
                    createdAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
