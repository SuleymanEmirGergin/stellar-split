# ─── Build Stage ──────────────────────────────────────────────────────────────
# Build context: repo root (railway.toml sets dockerfilePath = "backend/Dockerfile")
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (use backend/package*.json from repo root context)
COPY backend/package*.json ./
RUN npm ci --ignore-scripts

# Copy backend source into /app
COPY backend/ .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

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

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/live || exit 1

CMD ["node", "dist/main.js"]
