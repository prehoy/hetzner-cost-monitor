import { defineRoute, z } from "@prehoy/baguette";
import { eq } from "drizzle-orm";
import { S3Client } from "bun";
import db from "../../db/client";
import { backupConfig } from "../../db/schema";
import { encrypt, decrypt } from "../../methods/crypto";
import { scheduleBackups } from "../../methods/backup/scheduler";

// Save S3 backup config. The secret is validated against the bucket before
// storing, encrypted at rest. On edit, an omitted secret keeps the existing one.
export default defineRoute({
  method: "post",
  tags: ["Backup"],
  auth: true,
  request: {
    body: z.object({
      endpoint: z.string().optional(),
      region: z.string().optional(),
      bucket: z.string().optional(),
      prefix: z.string().optional(),
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
      intervalHours: z.number().optional(),
      retention: z.number().optional(),
      enabled: z.boolean().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
    if (!body.bucket || !body.accessKeyId) {
      return c.json({ error: "bucket and accessKeyId are required" }, 400);
    }

    const existing = await db.query.backupConfig.findFirst();
    // Secret: use the new one if given, else reuse the stored one.
    let secret = body.secretAccessKey;
    if (!secret) {
      if (!existing) return c.json({ error: "secretAccessKey is required" }, 400);
      secret = decrypt(existing.secretEncrypted, existing.secretIv);
    }

    // Validate credentials against the bucket (list is a cheap read check).
    try {
      const test = new S3Client({
        accessKeyId: body.accessKeyId,
        secretAccessKey: secret,
        bucket: body.bucket,
        region: body.region || "auto",
        endpoint: body.endpoint || undefined,
      });
      await test.list({ prefix: (body.prefix || "hacm") + "/", maxKeys: 1 });
    } catch (e: any) {
      return c.json({ error: `Could not reach the bucket with those credentials: ${e?.message ?? e}` }, 400);
    }

    const enc = encrypt(secret);
    const values = {
      endpoint: body.endpoint || null,
      region: body.region || null,
      bucket: body.bucket,
      prefix: body.prefix || "hacm",
      accessKeyId: body.accessKeyId,
      secretEncrypted: enc.ciphertext,
      secretIv: enc.iv,
      intervalHours: body.intervalHours ?? 24,
      retention: body.retention ?? 14,
      enabled: body.enabled ?? true,
      updatedAt: new Date(),
    };
    if (existing) {
      await db.update(backupConfig).set(values).where(eq(backupConfig.id, existing.id));
    } else {
      await db.insert(backupConfig).values(values);
    }
    await scheduleBackups();
    return c.json({ status: "success" });
  },
});
