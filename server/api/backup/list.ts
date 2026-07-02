import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import db from "../../db/client";
import { requireAuth } from "../../methods/auth/session";
import { s3From } from "../../methods/backup/client";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

// List backups currently in the bucket (newest first).
async function list(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const cfg = await db.query.backupConfig.findFirst();
  if (!cfg) return c.json({ backups: [] });
  const s3 = s3From(cfg);
  const res = await s3.list({ prefix: `${cfg.prefix}/` });
  const backups = (res?.contents ?? [])
    .filter((o: any) => o.key.endsWith(".db.gz"))
    .map((o: any) => ({ key: o.key, size: o.size, lastModified: o.lastModified }))
    .sort((a: any, b: any) => (a.key < b.key ? 1 : -1));
  return c.json({ backups });
}

const handler = (c: Context) => routeHandler({ name: "backup_list", handler: list, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Backup"],
  path: "/api/backup/list",
  operationId: "backupList",
  responses: {
    500: ErrorSchema,
    200: {
      description: "Backups in the bucket",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: { backups: { type: "array", items: { type: "object" } } },
          },
        },
      },
    },
  },
});
