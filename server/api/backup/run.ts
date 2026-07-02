import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import { requireAuth } from "../../methods/auth/session";
import { runBackup } from "../../methods/backup/run";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

// Trigger a backup right now.
async function run(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const { key, size } = await runBackup();
  return c.json({ status: "success", key, size });
}

const handler = (c: Context) => routeHandler({ name: "backup_run", handler: run, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Backup"],
  path: "/api/backup/run",
  operationId: "backupRun",
  responses: {
    500: ErrorSchema,
    200: {
      description: "Backup created",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: { type: "string" },
              key: { type: "string" },
              size: { type: "number" },
            },
          },
        },
      },
    },
  },
});
