import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import db from "../../db/client";
import { requireAuth } from "../../methods/auth/session";
import routeHandler from "../../methods/routeHandler";

// Current backup config (never returns the secret) + last-run status.
async function config(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const cfg = await db.query.backupConfig.findFirst();
  if (!cfg) return c.json({ configured: false });
  return c.json({
    configured: true,
    config: {
      endpoint: cfg.endpoint,
      region: cfg.region,
      bucket: cfg.bucket,
      prefix: cfg.prefix,
      accessKeyId: cfg.accessKeyId,
      intervalHours: cfg.intervalHours,
      retention: cfg.retention,
      enabled: cfg.enabled,
      lastBackupAt: cfg.lastBackupAt,
      lastBackupError: cfg.lastBackupError,
      lastBackupKey: cfg.lastBackupKey,
    },
  });
}

const handler = (c: Context) => routeHandler({ name: "backup_config", handler: config, c });
export default handler;

export const route = createRoute({
  method: "get",
  tags: ["Backup"],
  path: "/api/backup/config",
  operationId: "backupConfig",
  responses: {
    200: {
      description: "Backup config + status",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              configured: { type: "boolean" },
              config: { type: "object" },
            },
          },
        },
      },
    },
  },
});
