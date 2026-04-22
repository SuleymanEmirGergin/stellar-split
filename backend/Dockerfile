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

EXPOSE 3001

# Healthcheck uses the same PORT the app listens on (Railway injects PORT;
# locally defaults to 3001 via the shell fallback). Container-internal, so
# localhost is fine here — Railway's external healthcheck is separate and
# hits the 0.0.0.0 bind set up in main.ts.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3001}/health/live" || exit 1

# Run migrations on boot, then start the server. Migration failures don't
# kill the process — the server still comes up (healthcheck only hits memory,
# not DB), and the ready endpoint at /health/ready surfaces the DB state.
# Without this chain, a fresh Railway environment crashes on first query
# because no one ran `prisma migrate deploy` against the injected DATABASE_URL.
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js migrate deploy || echo 'migrate failed — continuing'; node dist/main.js"]
