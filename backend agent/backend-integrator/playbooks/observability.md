# Observability Playbook

Apply this playbook to every project with 2+ services or production SLAs. Backend Integrator Rule 23 mandates observability hooks on every project.

Triggers:
- Any production deployment (always apply minimum: structured logging + health checks)
- Multi-service or microservice architecture
- SLA commitments (uptime %, response time p99)
- "System status" or uptime page on the frontend
- Admin dashboard showing error rates, latency, or throughput
- Customer-facing API (external developers need visibility)
- On-call rotation or alerting requirements

---

## 1. What to Infer From Frontend

| Frontend Signal | Observability Requirement |
|---|---|
| Any production deployment | Structured logging + health checks (Sections 2, 4) |
| Admin dashboard with error counts | Error tracking + metrics (Sections 5, 6) |
| "System status" page | Health check endpoints exposed to status page (Section 4) |
| SLA or uptime guarantee | Uptime monitoring + alerting (Section 8) |
| Multi-service / microservices | Distributed tracing with correlation IDs (Section 3) |
| Long-running jobs, exports | Job progress metrics + timeout alerting (Section 5) |
| Public API / developer portal | Request rate, error rate, latency per endpoint (Section 5) |

---

## 2. Structured Logging

All logs must be machine-parseable JSON in production. Human-readable format is only for local development.

### Pino Setup (Node.js — recommended)

```ts
// src/common/observability/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',

  // Human-readable only in development
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,

  // Static fields on every log line
  base: {
    service: process.env.SERVICE_NAME ?? 'api',
    version: process.env.APP_VERSION ?? 'unknown',
    env: process.env.NODE_ENV,
  },

  // Redact sensitive fields — never log secrets
  redact: {
    paths: [
      'password', 'password_hash',
      'token', 'access_token', 'refresh_token',
      'secret', 'api_key', 'authorization',
      'card_number', 'cvv',
      '*.password', '*.token', '*.secret',
      'req.headers.authorization',
      'req.body.password',
    ],
    censor: '[REDACTED]',
  },

  // ISO timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

### Correlation ID Middleware

Every request gets a unique ID that propagates through all log lines and downstream calls:

```ts
// src/common/observability/correlation-id.middleware.ts
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: pino.Logger;
    }
  }
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Accept from upstream or generate new
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Child logger with request context
  req.log = logger.child({
    requestId,
    userId: (req as any).user?.id,  // set after auth middleware
    method: req.method,
    path: req.path,
  });

  next();
}
```

### Log Levels

| Level | When to Use |
|---|---|
| `error` | Unhandled exceptions, external service failures, data corruption |
| `warn` | Degraded behavior, retries, deprecated usage, near-threshold alerts |
| `info` | Request lifecycle, job start/end, significant state changes |
| `debug` | Detailed flow, SQL queries, cache hits/misses (disable in production) |
| `trace` | Loop-level detail (never in production) |

### Request Logging Middleware

```ts
// Log every request with duration
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'info';

    req.log[level]({
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.get('content-length'),
    }, 'request completed');
  });

  next();
}
```

### Python / FastAPI — structlog

```python
# app/observability/logger.py
import structlog
import logging

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt='iso'),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)

log = structlog.get_logger()
```

```python
# Correlation ID via middleware
@app.middleware('http')
async def correlation_id_middleware(request: Request, call_next):
    request_id = request.headers.get('x-request-id', str(uuid4()))
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers['X-Request-ID'] = request_id
    structlog.contextvars.clear_contextvars()
    return response
```

---

## 3. Distributed Tracing

Use when the system has 2+ services that call each other (API → worker, API → external service).

### OpenTelemetry Setup (Node.js)

```ts
// src/instrument.ts — must be the FIRST import in main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.SERVICE_NAME ?? 'api',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION ?? '0.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
    }),
  ],
});

sdk.start();
```

```ts
// main.ts — instrument.ts must be first
import './instrument';
import { NestFactory } from '@nestjs/core';
// ...
```

### Manual Span for Critical Operations

```ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('payments-service');

async function processPayment(orderId: string): Promise<void> {
  const span = tracer.startSpan('payments.process', {
    attributes: { 'order.id': orderId },
  });

  try {
    await stripeService.charge(orderId);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
    throw err;
  } finally {
    span.end();
  }
}
```

### Tracing Backend Options

| Option | Best For | Self-Hosted |
|---|---|---|
| **Jaeger** | Development, open-source | ✅ |
| **Zipkin** | Simple setups | ✅ |
| **Grafana Tempo** | Grafana stack integration | ✅ |
| **Datadog APM** | Full observability platform | ❌ (managed) |
| **AWS X-Ray** | AWS-native deployments | ❌ (managed) |

---

## 4. Health Check Endpoints

Every service must expose health endpoints. Used by load balancers, container orchestration, and uptime monitors.

```ts
// src/modules/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly db: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Liveness probe — is the process alive?
   * Returns 200 immediately. Only fails if the process is deadlocked.
   * Kubernetes: livenessProbe
   */
  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness probe — can this instance accept traffic?
   * Checks all dependencies. Fails if DB or Redis is unreachable.
   * Kubernetes: readinessProbe
   * Load balancer: remove from rotation on failure.
   */
  @Get('ready')
  async ready(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status: HealthStatus = {
      status: checks.every(c => c.status === 'fulfilled') ? 'ok' : 'degraded',
      checks: {
        database: checks[0].status === 'fulfilled' ? 'ok' : 'fail',
        redis: checks[1].status === 'fulfilled' ? 'ok' : 'fail',
      },
      timestamp: new Date().toISOString(),
    };

    if (status.status !== 'ok') {
      throw new ServiceUnavailableException(status);
    }

    return status;
  }

  private async checkDatabase(): Promise<void> {
    await this.db.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    await this.redis.ping();
  }
}
```

### Health Response Schema

```ts
interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  checks: {
    database: 'ok' | 'fail';
    redis?: 'ok' | 'fail';
    queue?: 'ok' | 'fail';
    externalApi?: 'ok' | 'fail' | 'degraded';
  };
  version?: string;
  uptime?: number;    // process.uptime()
  timestamp: string;
}
```

### Kubernetes Probe Config

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3
```

---

## 5. Metrics (Prometheus)

Export metrics for dashboards and alerting. Use `prom-client` for Node.js.

### Core Metrics Setup

```ts
// src/common/observability/metrics.service.ts
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export class MetricsService {
  readonly registry = new Registry();

  // HTTP request duration histogram
  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  // HTTP request total counter
  readonly httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  // Active HTTP connections gauge
  readonly activeConnections = new Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections',
    registers: [this.registry],
  });

  // Background job metrics
  readonly jobDuration = new Histogram({
    name: 'job_duration_seconds',
    help: 'Duration of background jobs',
    labelNames: ['queue', 'job_name', 'status'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
    registers: [this.registry],
  });

  readonly jobTotal = new Counter({
    name: 'jobs_total',
    help: 'Total number of jobs processed',
    labelNames: ['queue', 'job_name', 'status'],
    registers: [this.registry],
  });

  constructor() {
    // Node.js default metrics: heap, CPU, GC, event loop lag
    collectDefaultMetrics({ register: this.registry });
  }
}
```

### Metrics Middleware

```ts
export function metricsMiddleware(metrics: MetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const end = metrics.httpRequestDuration.startTimer();

    res.on('finish', () => {
      const labels = {
        method: req.method,
        route: req.route?.path ?? req.path,
        status_code: String(res.statusCode),
      };
      end(labels);
      metrics.httpRequestTotal.inc(labels);
    });

    next();
  };
}
```

### Metrics Endpoint

```ts
// Expose metrics for Prometheus scrape — internal only
@Get('metrics')
@Header('Content-Type', 'text/plain; version=0.0.4')
async getMetrics(): Promise<string> {
  return this.metrics.registry.metrics();
}
```

**Never expose `/metrics` publicly.** Restrict to internal network or add IP allowlist.

### Key Metrics to Track

| Metric | Type | Alert Threshold |
|---|---|---|
| `http_request_duration_seconds` p99 | Histogram | > 2s for 5 min |
| `http_requests_total` error rate | Counter | > 5% errors for 5 min |
| `http_active_connections` | Gauge | > 1000 sustained |
| `jobs_total` failure rate | Counter | > 10% failures |
| `nodejs_heap_used_bytes` | Gauge | > 80% of limit |
| `nodejs_event_loop_delay_seconds` | Histogram | p99 > 100ms |

---

## 6. Error Tracking (Sentry)

Capture uncaught exceptions and structured error events with full context.

```ts
// src/instrument.ts (add to existing OpenTelemetry setup)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ tracing: true }),
  ],
  // Never send PII to Sentry
  beforeSend(event) {
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.token;
    }
    return event;
  },
});
```

```ts
// Capture errors with context in services
try {
  await this.stripe.charges.create(chargeData);
} catch (err) {
  Sentry.withScope(scope => {
    scope.setUser({ id: userId });
    scope.setTag('operation', 'stripe.charge');
    scope.setExtra('chargeData', { amount: chargeData.amount, currency: chargeData.currency });
    Sentry.captureException(err);
  });
  throw err;
}
```

### Python / FastAPI — Sentry

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    environment=os.getenv('NODE_ENV', 'production'),
    traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
    integrations=[FastApiIntegration(), SqlalchemyIntegration()],
)
```

---

## 7. Log Aggregation

Structured JSON logs must be shipped to a centralized log store. Never rely on container stdout alone.

### Platform Options

| Platform | Best For | Retention |
|---|---|---|
| **Grafana Loki** | Self-hosted, Grafana stack | Configurable |
| **Datadog Logs** | Full observability platform | 15 days default |
| **AWS CloudWatch** | AWS-native deployments | Configurable |
| **Logtail (BetterStack)** | Simple setup, Railway/Vercel | 3–30 days |
| **Elasticsearch (ELK)** | High volume, complex queries | Self-managed |

### Pino Transport for Logtail

```ts
// Add to pino config for production
transport: process.env.NODE_ENV === 'production'
  ? {
      target: '@logtail/pino',
      options: { sourceToken: process.env.LOGTAIL_SOURCE_TOKEN },
    }
  : { target: 'pino-pretty' },
```

### Log Query Patterns (Loki / Datadog)

```
# Find all errors for a specific request
{service="api"} |= "requestId=abc-123" | level = "error"

# Track slow requests over 2 seconds
{service="api"} | json | durationMs > 2000

# Count errors by route over 1 hour
sum by (path) (rate({service="api"} | level = "error" [1h]))
```

---

## 8. Alerting Rules

Define alert rules in Prometheus/Grafana Alertmanager or your platform's alerting UI.

| Alert | Condition | Severity | Action |
|---|---|---|---|
| High error rate | `rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05` | Critical | Page on-call |
| High p99 latency | `histogram_quantile(0.99, http_request_duration_seconds) > 2` | Warning | Notify team |
| Database down | `health/ready` returns non-200 | Critical | Page on-call |
| Job failure spike | `rate(jobs_total{status="failed"}[5m]) > 0.1` | Warning | Notify team |
| High memory usage | `nodejs_heap_used_bytes / nodejs_heap_size_limit > 0.85` | Warning | Notify team |
| Event loop lag | `nodejs_eventloop_lag_p99_seconds > 0.1` | Warning | Investigate |
| Disk usage | `disk_used_percent > 85` | Warning | Scale storage |

### Notification Channels

```yaml
# Grafana Alertmanager / notification policy
receivers:
  - name: oncall-critical
    slack_configs:
      - channel: '#incidents'
        webhook_url: $SLACK_ONCALL_WEBHOOK
    pagerduty_configs:
      - routing_key: $PAGERDUTY_KEY

  - name: team-warning
    slack_configs:
      - channel: '#backend-alerts'
        webhook_url: $SLACK_TEAM_WEBHOOK
```

---

## 9. API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| GET | /health/live | ❌ public | Liveness probe |
| GET | /health/ready | ❌ public | Readiness probe (checks DB, Redis) |
| GET | /metrics | internal only | Prometheus metrics scrape |

`/metrics` must be restricted to the internal network or monitoring agent IP range. Never expose publicly.

---

## 10. Environment Variables

```bash
# Service Identity
SERVICE_NAME=api                     # appears in every log line and trace
APP_VERSION=1.0.0                    # set via CI from git tag

# Logging
LOG_LEVEL=info                       # trace|debug|info|warn|error
LOG_FORMAT=json                      # json (production) | pretty (development)

# Log Aggregation
LOGTAIL_SOURCE_TOKEN=                # BetterStack/Logtail token
DATADOG_API_KEY=                     # Datadog log ingestion

# Distributed Tracing
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces
OTEL_SERVICE_NAME=api                # overrides SERVICE_NAME for OTEL

# Error Tracking
SENTRY_DSN=                          # Sentry project DSN
SENTRY_TRACES_SAMPLE_RATE=0.1        # 10% of transactions traced (adjust for cost)

# Metrics
METRICS_PORT=9090                    # internal port for /metrics (separate from API port)
```

---

## 11. Observability Rules

- **Structured logs mandatory:** All production log output must be JSON. `console.log` in production code is forbidden — use the Pino/structlog logger.
- **Correlation IDs:** Every request must carry an `X-Request-ID` header. All log lines within a request context must include `requestId`.
- **Health endpoints required:** Every service must expose `/health/live` and `/health/ready` before going to production.
- **No PII in logs:** Log fields must never include `password`, `token`, `secret`, `card_number`, or raw email addresses. Apply Pino `redact` config (security.md).
- **No PII in Sentry:** `beforeSend` hook must strip PII fields before events are transmitted.
- **Metrics for public APIs:** Any service with external API access must expose `http_request_duration_seconds` and `http_requests_total` metrics.
- **Alert coverage:** Every production service must have at minimum: error rate alert, latency p99 alert, and health check alert configured before launch.
- **Debug logs off in production:** `LOG_LEVEL` must be `info` or higher in production. `debug` or `trace` levels are only for local development.

---

## 12. File Structure

```
src/
├── common/
│   └── observability/
│       ├── logger.ts                    ← Pino instance + redact config
│       ├── metrics.service.ts           ← prom-client counters, histograms, gauges
│       ├── correlation-id.middleware.ts ← X-Request-ID propagation + child logger
│       └── request-logger.middleware.ts ← request/response logging with duration
├── instrument.ts                        ← OpenTelemetry SDK init + Sentry init (first import)
├── modules/
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts         ← /health/live, /health/ready
└── config/
    └── observability.config.ts          ← Zod schema for LOG_LEVEL, SENTRY_DSN, OTEL vars
```
