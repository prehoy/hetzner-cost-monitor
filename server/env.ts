import { env } from "bun";

export default function validateENV() {
  const required = ["APP_SECRET"];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required ENV variables: ${missing.join(", ")}`);
  }
}

const tEnv = {
  APP_NAME: env.APP_NAME ?? "hetzner-cost-monitor",
  APP_SECRET: env.APP_SECRET as string,
  DB_PATH: env.DB_PATH ?? "./hacm.db",
  PORT: env.PORT ?? "3000",
  FRONTEND_URL: env.FRONTEND_URL as string | undefined,
  AUTH_COOKIE_KEY: env.AUTH_COOKIE_KEY ?? "hacm_session",
  COOKIE_SECURE: env.COOKIE_SECURE === "true",
  POLL_INTERVAL_MS: Number(env.POLL_INTERVAL_MS ?? 10000),
  PRICING_TTL_MS: Number(env.PRICING_TTL_MS ?? 3600000),
};

export { tEnv };
