import { createRoute } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { S3Client } from "bun";
import type { Context } from "hono";
import db from "../../db/client";
import { backupConfig } from "../../db/schema";
import { requireAuth } from "../../methods/auth/session";
import { encrypt, decrypt } from "../../methods/crypto";
import { scheduleBackups } from "../../methods/backup/scheduler";
import routeHandler from "../../methods/routeHandler";
import ErrorSchema from "../../openapi_schemas/ErrorSchema";

// Save S3 backup config. The secret is validated against the bucket before
// storing, encrypted at rest. On edit, an omitted secret keeps the existing one.
async function save(c: Context) {
  if (!(await requireAuth(c))) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as {
    endpoint?: string;
    region?: string;
    bucket?: string;
    prefix?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    intervalHours?: number;
    retention?: number;
    enabled?: boolean;
  };
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
}

const handler = (c: Context) => routeHandler({ name: "backup_save", handler: save, c });
export default handler;

export const route = createRoute({
  method: "post",
  tags: ["Backup"],
  path: "/api/backup/save",
  operationId: "backupSave",
  request: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              endpoint: { type: "string" },
              region: { type: "string" },
              bucket: { type: "string" },
              prefix: { type: "string" },
              accessKeyId: { type: "string" },
              secretAccessKey: { type: "string" },
              intervalHours: { type: "number" },
              retention: { type: "number" },
              enabled: { type: "boolean" },
            },
            required: ["bucket", "accessKeyId"],
          },
        },
      },
    },
  },
  responses: {
    500: ErrorSchema,
    200: {
      description: "Saved",
      content: {
        "application/json": {
          schema: { type: "object", properties: { status: { type: "string" } } },
        },
      },
    },
  },
});
