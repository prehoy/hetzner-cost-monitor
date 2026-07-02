import { eq } from "drizzle-orm";
import db from "../../db/client";
import { backupConfig } from "../../db/schema";
import logger from "../logger";
import processError from "../processError";
import { runBackup } from "./run";

let timer: ReturnType<typeof setInterval> | null = null;

// (Re)schedule automatic backups from the stored config. Call on boot and after
// the config changes. Failures are recorded, not fatal.
export async function scheduleBackups() {
  const cfg = await db.query.backupConfig.findFirst();
  if (timer) clearInterval(timer);
  timer = null;
  if (!cfg || !cfg.enabled) return;

  const ms = Math.max(1, cfg.intervalHours) * 3_600_000;
  const tick = () =>
    runBackup().catch(async (e) => {
      logger.error({ message: "Scheduled backup failed", error: processError(e) });
      await db
        .update(backupConfig)
        .set({ lastBackupAt: new Date(), lastBackupError: processError(e).error_message })
        .where(eq(backupConfig.id, cfg.id));
    });
  timer = setInterval(tick, ms);
  logger.info({ message: `Backups scheduled every ${cfg.intervalHours}h -> ${cfg.bucket}` });
}
