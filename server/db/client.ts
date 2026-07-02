import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import path from "path";
import { tEnv } from "../env";
import { schema } from "./schema";

const sqlite = new Database(tEnv.DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA busy_timeout = 5000;");

const db = drizzle(sqlite, { schema });

// Auto-apply generated migrations on boot — no separate driver / step needed.
migrate(db, { migrationsFolder: path.join(import.meta.dir, "migrations") });

export default db;
