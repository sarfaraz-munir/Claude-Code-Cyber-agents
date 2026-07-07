# Multi-stage build. Context MUST be the repo root (the dashboard needs the engine).
#   docker build -f apps/dashboard/Dockerfile -t ciso-dash .

# ── Stage 1: build engine + dashboard ──────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Build the engine first.
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build

# Build the dashboard (SPA).
WORKDIR /app/apps/dashboard
COPY apps/dashboard/package.json ./
RUN npm install
COPY apps/dashboard/ ./
RUN npm run build

# ── Stage 2: runtime ────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Engine build output + its package manifest (dashboard imports it via the file link).
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/dist /app/dist

# Dashboard: server source, built SPA, and node_modules (includes the ciso-agents symlink).
COPY --from=builder /app/apps/dashboard /app/apps/dashboard

WORKDIR /app/apps/dashboard
EXPOSE 8787
CMD ["npm", "run", "start"]
