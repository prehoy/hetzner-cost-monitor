import { defineEnv, z } from "@prehoy/baguette";

// Validated + typed at boot from one zod schema. Throws a clear aggregated error
// if anything required is missing. Single-tenant self-hosted tool — mostly optional.
export const tEnv = defineEnv(
  z.object({
    APP_NAME: z.string().default("hetzner-cost-monitor"),
    APP_SECRET: z.string().min(1),
    DB_PATH: z.string().default("./hacm.db"),
    PORT: z.coerce.number().default(3000),
    FRONTEND_URL: z.string().optional(),
    AUTH_COOKIE_KEY: z.string().default("hacm_session"),
    COOKIE_SECURE: z.string().default("false").transform((v) => v === "true"),
    POLL_INTERVAL_MS: z.coerce.number().default(10000),
    PRICING_TTL_MS: z.coerce.number().default(3600000),
    // Skip the background collector (demo data / read-only replica).
    DISABLE_COLLECTOR: z.string().default("false").transform((v) => v === "true"),
    // Spend-alert evaluator cadence (webhook alerts feature).
    ALERT_INTERVAL_MS: z.coerce.number().default(300000),
  }),
);

// Back-compat: defineEnv already validates on import; kept so the old
// `import validateENV from "./env"` call site doesn't break.
export default function validateENV(): void {}
