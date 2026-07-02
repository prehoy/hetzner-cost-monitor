import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import { requireAuth } from "../../methods/auth/session";
import { stageRestore } from "../../methods/backup/run";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

// Stage a backup for restore. The DB is swapped in on the next boot (safe — the
// file isn't open then), so the app must be restarted to apply.
async function restore(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { key?: string };
  if (!body.key) return c.json({ error: "key required" }, 400);
  await stageRestore(body.key);
  return c.json({
    status: "staged",
    note: "Restart the app to apply the restore (redeploy / restart the pod).",
  });
}

const handler = (c: Context) => routeHandler({ name: "backup_restore", handler: restore, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Backup"],
  path: "/api/backup/restore",
  operationId: "backupRestore",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { key: { type: "string" } },
            required: ["key"],
          },
        },
      },
    },
  },
  responses: {
    500: ErrorSchema,
    200: {
      description: "Restore staged",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { status: { type: "string" }, note: { type: "string" } },
          },
        },
      },
    },
  },
});
