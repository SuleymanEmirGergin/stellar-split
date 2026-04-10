/**
 * Prometheus metrics registry for StellarSplit API.
 *
 * Exports:
 *   - Default Node.js metrics (GC, heap, event loop lag, etc.)
 *   - HTTP request duration histogram
 *   - Active SSE connections gauge
 *   - BullMQ job counters (via manual increment from workers)
 */
import { Registry, collectDefaultMetrics, Histogram, Counter, Gauge } from 'prom-client';

export const metricsRegistry = new Registry();

// Default Node.js runtime metrics
collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'stellarsplit_',
});

// ─── HTTP ──────────────────────────────────────────────────────────────────────

export const httpRequestDuration = new Histogram({
  name: 'stellarsplit_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const httpRequestTotal = new Counter({
  name: 'stellarsplit_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

// ─── SSE ──────────────────────────────────────────────────────────────────────

export const sseActiveConnections = new Gauge({
  name: 'stellarsplit_sse_active_connections',
  help: 'Number of active SSE connections',
  registers: [metricsRegistry],
});

// ─── BullMQ Workers ───────────────────────────────────────────────────────────

export const workerJobsProcessed = new Counter({
  name: 'stellarsplit_worker_jobs_processed_total',
  help: 'Total BullMQ jobs processed',
  labelNames: ['queue', 'status'],
  registers: [metricsRegistry],
});

// ─── Business ─────────────────────────────────────────────────────────────────

export const settlementsConfirmed = new Counter({
  name: 'stellarsplit_settlements_confirmed_total',
  help: 'Total Stellar settlements confirmed',
  registers: [metricsRegistry],
});

export const expensesCreated = new Counter({
  name: 'stellarsplit_expenses_created_total',
  help: 'Total expenses created',
  registers: [metricsRegistry],
});
