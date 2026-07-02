import type { CreateClientConfig } from "./generated/client.gen";

// Runtime config for the generated hey-api fetch client. baseUrl stays relative
// so requests hit the same origin (dev: Vite proxies /api -> backend; prod:
// served from the same origin). credentials:"include" carries the session cookie.
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: import.meta.env.VITE_API_URL || "",
  credentials: "include",
});
