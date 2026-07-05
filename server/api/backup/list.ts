import { defineRoute, z } from "@prehoy/baguette";
import db from "../../db/client";
import { s3From } from "../../methods/backup/client";

// List backups currently in the bucket (newest first).
export default defineRoute({
  method: "get",
  tags: ["Backup"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
    const cfg = await db.query.backupConfig.findFirst();
    if (!cfg) return c.json({ backups: [] });
    const s3 = s3From(cfg);
    const res = await s3.list({ prefix: `${cfg.prefix}/` });
    const backups = (res?.contents ?? [])
      .filter((o: any) => o.key.endsWith(".db.gz"))
      .map((o: any) => ({ key: o.key, size: o.size, lastModified: o.lastModified }))
      .sort((a: any, b: any) => (a.key < b.key ? 1 : -1));
    return c.json({ backups });
  },
});
