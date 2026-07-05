import { serve } from "@prehoy/baguette";
import { existsSync } from "node:fs";
import { authResolver } from "./methods/auth/baguetteAuth";
import { startCollector } from "./methods/collector/start";
import { scheduleBackups } from "./methods/backup/scheduler";
import { startAlerts } from "./methods/alerts/scheduler";
import { tEnv } from "./env";

const hasPublic = existsSync("./public");

await serve({
  routesDir: "./api",
  basePath: "/api",
  port: tEnv.PORT,
  auth: authResolver,
  // Reflect the caller's Origin so cookie auth works whether the client is
  // same-origin (vite proxy) or a separate dev port. Self-hosted, single-tenant.
  cors: {
    reflect: true,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
  },
  securityHeaders: true,
  bodyLimit: 1_000_000,
  docs: { title: "Hetzner Advanced Cost Monitoring", theme: "purple" },
  spa: hasPublic ? "./public" : undefined,
  // Apply SQLite migrations before accepting traffic (db/client runs them on import).
  onBoot: async () => {
    await import("./db/client");
  },
});

// Background loops (manual intervals — no HA, single self-hosted instance).
if (!tEnv.DISABLE_COLLECTOR) startCollector();
scheduleBackups().catch(() => {});
startAlerts();
