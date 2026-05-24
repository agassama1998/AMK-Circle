# ─────────────────────────────────────────────────────────────────────────────
# AMK Circle — Dockerfile (Web / Docker mode)
#
# Runs the Express REST API + serves the React SPA.
# The server bridges HTTP requests to the same IPC handlers used by Electron,
# so zero React source changes are needed.
#
# Build:  docker build -t amkcircle .
# Run:    docker compose up -d
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build deps for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy manifests first so npm install is cached when only source changes
COPY package.json ./

# Install all deps (dev included — we need Vite to build the React app).
# --ignore-scripts skips the postinstall "electron-builder install-app-deps"
# which would compile better-sqlite3 for Electron's ABI instead of Node's.
# We then rebuild it explicitly for the current Node.js runtime.
RUN npm install --ignore-scripts && \
    npm rebuild better-sqlite3 --build-from-source

# Copy the rest of the source
COPY . .

# Build the React/Vite front-end → dist/
RUN npm run build

# Prune devDependencies so the production image stays lean
RUN npm prune --production

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

# Non-root user for security
RUN addgroup -S amk && adduser -S amk -G amk

WORKDIR /app

# Runtime lib for better-sqlite3
RUN apk add --no-cache sqlite-libs

# Copy built artefacts from builder
COPY --from=builder --chown=amk:amk /app/node_modules      ./node_modules
COPY --from=builder --chown=amk:amk /app/dist              ./dist
COPY --from=builder --chown=amk:amk /app/server            ./server
COPY --from=builder --chown=amk:amk /app/electron/database ./electron/database
COPY --from=builder --chown=amk:amk /app/electron/handlers ./electron/handlers
COPY --chown=amk:amk package.json ./

# Persistent SQLite data directory
RUN mkdir -p /data && chown amk:amk /data

USER amk

EXPOSE 3000
VOLUME ["/data"]

ENV NODE_ENV=production \
    DB_PATH=/data/amkcircle.db \
    JWT_SECRET=change-me-in-production \
    PORT=3000

# Health check (matches docker-compose healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server/index.js"]
