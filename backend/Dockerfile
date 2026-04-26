# ─── Build Stage ──────────────────────────────────────────────────────────────
# Build context: repo root (railway.toml sets dockerfilePath = "backend/Dockerfile")
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (use backend/package*.json from repo root context)
COPY backend/package*.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps

# Copy backend source into /app
COPY backend/ .

# Generate Prisma client (no DB connection needed at build time)
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Default PORT to 8080 — matches Railway's auto-domain routing convention.
# When Railway *does* inject PORT (which it should, but doesn't always for
# older projects), that injection wins because env vars at runtime
# override Dockerfile ENV. So this is a safety net, not a competing
# source of truth.
ENV PORT=8080

# Install only production deps
COPY backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts --legacy-peer-deps

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy Prisma schema + config from builder (not from build context)
COPY --from=builder /app/prisma ./prisma

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

# NOTE: Docker-level HEALTHCHECK intentionally removed.
# Railway runs its own external healthcheck (see railway.toml's
# `healthcheckPath`) and a container-internal HEALTHCHECK that disagrees
# with it produces a confusing "container unhealthy" state where the
# external proxy refuses to route traffic even when the app is fine.
# If we ever go back to plain Docker hosting, restore something like:
#   HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
#     CMD wget -qO- "http://localhost:${PORT:-3001}/health/live" || exit 1

# Start the server directly. Schema migrations run separately:
#   - In CI / development: `npm run db:migrate` against the test DB
#   - On Railway: a one-shot Job (or `railway run npx prisma migrate deploy`)
#     against production once per release with a real schema delta.
#
# Inlining `prisma migrate deploy` here was triggering a c12 transitive
# dependency cascade in Prisma 6 (c12 → perfect-debounce → jiti → …)
# that spammed every container start with ERR_MODULE_NOT_FOUND warnings.
# The spam is now gone; if you actually changed the schema, run migrate
# explicitly before bumping the deployment.
CMD ["node", "dist/main.js"]
