import { defineConfig } from "@hey-api/openapi-ts";

// Typed fetch SDK + TanStack Query options from the backend OpenAPI spec.
// Run `bun run openapi` with the backend reachable. Override with VITE_OPENAPI_URL.
export default defineConfig({
  input: process.env.VITE_OPENAPI_URL ?? "http://localhost:3000/api/doc",
  output: { path: "src/api/generated", postProcess: ["prettier"] },
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    { name: "@hey-api/client-fetch", runtimeConfigPath: "./src/api/client.ts" },
    "@tanstack/react-query",
  ],
});
