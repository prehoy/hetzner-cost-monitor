import { defineRoute, z } from "@prehoy/baguette";
import db from "../../db/client";

// Current backup config (never returns the secret) + last-run status.
export default defineRoute({
  method: "get",
  tags: ["Backup"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
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
  },
});
