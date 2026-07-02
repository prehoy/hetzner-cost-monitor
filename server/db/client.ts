import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { existsSync, renameSync, rmSync } from "fs";
import path from "path";
import { tEnv } from "../env";
import { schema } from "./schema";

// Restore-on-boot: if a restore was staged (a downloaded backup written to
// <DB_PATH>.restore), swap it in before opening — the safe moment, DB not open.
const RESTORE = tEnv.DB_PATH + ".restore";
if (existsSync(RESTORE)) {
  for (const s of ["-wal", "-shm"]) rmSync(tEnv.DB_PATH + s, { force: true });
  if (existsSync(tEnv.DB_PATH)) renameSync(tEnv.DB_PATH, `${tEnv.DB_PATH}.prerestore-${Date.now()}`);
  renameSync(RESTORE, tEnv.DB_PATH);
  console.log("Restored database from staged backup");
}

const sqlite = new Database(tEnv.DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA busy_timeout = 5000;");

const db = drizzle(sqlite, { schema });

// Auto-apply generated migrations on boot — no separate driver / step needed.
migrate(db, { migrationsFolder: path.join(import.meta.dir, "migrations") });

// Raw handle for maintenance ops (VACUUM INTO for consistent backup snapshots).
export const rawDb = sqlite;
export default db;
