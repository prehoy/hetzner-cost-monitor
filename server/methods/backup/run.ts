import { gzipSync } from "bun";
import { eq } from "drizzle-orm";
import { readFileSync, rmSync } from "fs";
import db, { rawDb } from "../../db/client";
import { backupConfig } from "../../db/schema";
import { tEnv } from "../../env";
import logger from "../logger";
import processError from "../processError";
import { s3From } from "./client";

// Snapshot the SQLite DB (VACUUM INTO = consistent copy even with WAL open),
// gzip it, upload to the configured bucket, then prune to the retention count.
export async function runBackup(): Promise<{ key: string; size: number }> {
  const cfg = await db.query.backupConfig.findFirst();
  if (!cfg) throw new Error("No backup configuration");

  const tmp = `${tEnv.DB_PATH}.snap-${Date.now()}`;
  rawDb.exec(`VACUUM INTO '${tmp.replace(/'/g, "")}'`);
  let gz: Uint8Array;
  try {
    gz = gzipSync(readFileSync(tmp));
  } finally {
    rmSync(tmp, { force: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `${cfg.prefix}/hacm-${stamp}.db.gz`;
  const s3 = s3From(cfg);
  await s3.write(key, gz, { type: "application/gzip" });

  // Retention: keep the newest N (ISO timestamp in the name sorts lexically).
  try {
    const listed = await s3.list({ prefix: `${cfg.prefix}/` });
    const keys = (listed?.contents ?? [])
      .map((o: any) => o.key as string)
      .filter((k) => k.endsWith(".db.gz"))
      .sort()
      .reverse();
    for (const old of keys.slice(cfg.retention)) await s3.delete(old);
  } catch (e) {
    logger.warn({ message: "Backup retention prune failed", error: processError(e) });
  }

  await db
    .update(backupConfig)
    .set({ lastBackupAt: new Date(), lastBackupError: null, lastBackupKey: key })
    .where(eq(backupConfig.id, cfg.id));
  logger.info({ message: `Backup uploaded: ${key} (${gz.length} bytes)` });
  return { key, size: gz.length };
}

// Download a backup and stage it for restore-on-boot (see db/client.ts).
export async function stageRestore(key: string): Promise<void> {
  const cfg = await db.query.backupConfig.findFirst();
  if (!cfg) throw new Error("No backup configuration");
  const s3 = s3From(cfg);
  const gz = new Uint8Array(await s3.file(key).arrayBuffer());
  const raw = Bun.gunzipSync(gz);
  await Bun.write(`${tEnv.DB_PATH}.restore`, raw);
}
