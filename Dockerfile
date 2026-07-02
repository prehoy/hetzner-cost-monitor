# Single-container build: compile the React frontend, then run the Bun server
# which serves the API and the built frontend from ./public.

# ── Stage 1: build the frontend ──────────────────────────────────────────
FROM oven/bun:1 AS web
WORKDIR /web
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile
COPY web/ ./
RUN bun run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────
FROM oven/bun:1
WORKDIR /app
COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY server/ ./
COPY --from=web /web/dist ./public

ENV PORT=3000
ENV DB_PATH=/data/hacm.db
VOLUME /data
EXPOSE 3000

# APP_SECRET must be supplied at runtime (see README).
CMD ["bun", "index.ts"]
