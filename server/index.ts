import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar as apiReference } from "@scalar/hono-api-reference";
import crypto from "crypto";
import { existsSync } from "fs";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { startCollector } from "./methods/collector/start";
import loadRoutes from "./methods/loadRoutes";
import validateENV, { tEnv } from "./env";

validateENV();

const app = new OpenAPIHono();

// Reflect the caller's origin so cookie auth works whether the client is
// same-origin (vite proxy) or a separate dev port. Self-hosted, single-tenant.
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? tEnv.FRONTEND_URL ?? "*",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);
app.use(async (c, next) => {
  c.set("process_id" as never, crypto.randomUUID() as never);
  await next();
});

await loadRoutes(app)
  .then((routes) => console.log("Routes loaded:", routes.length))
  .catch((error) => console.error("Failed to load routes:", error));

app.get(
  "/api/docs",
  apiReference({ theme: "purple", pageTitle: "Hetzner Advanced Cost Monitoring", url: "/api/doc" }),
);
app.doc("/api/doc", {
  openapi: "3.1.0",
  info: { title: "Hetzner Advanced Cost Monitoring", version: "v1" },
});

// Production: serve the built frontend from ./public so the whole app is one
// container. API routes are registered above, so they win; everything else
// falls through to the SPA. Absent in dev (frontend runs on Vite).
if (existsSync("./public")) {
  app.use("/*", serveStatic({ root: "./public" }));
  app.get("*", serveStatic({ path: "./public/index.html" }));
}

if (!tEnv.DISABLE_COLLECTOR) startCollector();

Bun.serve({
  port: Number(tEnv.PORT) || 3000,
  fetch: app.fetch,
});

console.log(`HACM server listening on :${tEnv.PORT}`);
