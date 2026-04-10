# Analytics & Insights Playbook

This playbook guides the Backend Integrator Agent when implementing analytics tracking, data aggregation, and reporting systems derived from frontend UI flows.

---

## 1. What to Infer From Frontend

Identify these UI elements to determine the scope of the analytics system:

- **Charts / Graphs**: Line, bar, pie, area — implies aggregation endpoints with time-range filters.
- **KPI Cards / Metrics**: "Total Revenue", "Active Users", "Orders Today" — implies fast summary endpoints.
- **Data Tables with Export**: Users want raw data → implies paginated endpoints + CSV export.
- **Date Range Pickers**: Always implies time-bucketed aggregation (daily, weekly, monthly).
- **Funnel Charts**: Implies event-based tracking and step-by-step conversion analysis.
- **Real-time Counters**: "Users online now" — implies WebSocket or polling endpoint.
- **Usage Tracking**: Actions tracked per user or session → event logging system.

---

## 2. Two Analytics Patterns

### Pattern A — Endpoint Aggregation (Simple)
Aggregate on-the-fly from existing entity tables. Best for:
- Small-to-medium data volumes.
- Non-real-time dashboards.
- Internal admin panels.

### Pattern B — Event Store (Scalable)
Track all domain events in a dedicated event log. Aggregate asynchronously. Best for:
- Product analytics.
- Large data volumes.
- Real-time or near-real-time dashboards.

Choose based on the complexity of the frontend analytics views.

---

## 3. Required Backend Entities

### For Pattern A (Aggregation)
No additional entities needed — query existing tables with GROUP BY, time filters, and window functions.

### For Pattern B (Event Store)
```
AnalyticsEvent
  - id
  - event_name (e.g., "user_signed_up", "payment_completed")
  - user_id (nullable — anonymous events possible)
  - session_id
  - properties (JSON — arbitrary metadata)
  - occurred_at (indexed)

AnalyticsAggregation (materialized view or pre-computed table)
  - id
  - metric_name
  - bucket_type: daily | weekly | monthly
  - bucket_date
  - value
  - dimensions (JSON — e.g., {country: "TR"})
  - computed_at
```

---

## 4. Required API Endpoints

### Summary / KPI Endpoints
- `GET /analytics/summary` — Returns top-level KPIs for the dashboard
  - Query params: `from`, `to`, `granularity` (day | week | month)

### Time-Series Data
- `GET /analytics/timeseries/:metric` — Returns data points for charts
  - Query params: `from`, `to`, `granularity`

### Breakdown / Segmentation
- `GET /analytics/breakdown/:metric` — Returns metric broken down by a dimension
  - Query params: `groupBy`, `from`, `to`

### Event Tracking (Pattern B)
- `POST /analytics/events` — Ingest a tracking event (lightweight, fire-and-forget)

### Export
- `GET /analytics/export` — Returns a CSV/Excel of the raw filtered data

---

## 5. Aggregation Strategy

### On-the-fly (Pattern A)
- Use database-level GROUP BY with date_trunc or equivalent.
- Cache results in Redis with a short TTL (60–300 seconds).
- For heavy queries, consider read replicas.

### Pre-computed (Pattern B)
- Run an aggregation job on a schedule (e.g., every hour, nightly).
- Store results in `AnalyticsAggregation` table.
- Dashboard endpoints read from this pre-computed table — always fast.

```
Cron job → aggregate events → write to AnalyticsAggregation → API reads fast
```

---

## 6. Performance Considerations

| Problem | Solution |
|---|---|
| Slow GROUP BY on large tables | Add composite index on `(occurred_at, event_name)` |
| Real-time counters causing DB load | Use Redis atomic counters (`INCR`) |
| Dashboard slow to load | Pre-compute aggregations with a cron job |
| Unbounded result sets | Always enforce `from`/`to` date bounds |
| Multiple concurrent chart queries | Batch into one summary endpoint where possible |

---

## 7. Export Flow

Large exports should be handled asynchronously:

```
POST /analytics/export → enqueue export job → return jobId
GET /exports/:id → poll status
GET /exports/:id/download → return signed URL when ready
```

Never stream large datasets in a synchronous HTTP response.

---

## 8. Access Control

- Analytics endpoints are typically **admin-only** or **owner-scoped**.
- Multi-tenant systems must filter all queries by `workspace_id` or `organization_id`.
- Never allow a user to query analytics data belonging to another tenant.

---

## 9. Environment Variables

```bash
# Analytics DB (optional read replica)
ANALYTICS_DB_URL=postgresql://...

# Redis (for caching + real-time counters)
REDIS_URL=redis://localhost:6379
ANALYTICS_CACHE_TTL=300              # seconds

# Export storage
EXPORT_STORAGE_BUCKET=exports-bucket

# Cron schedule for aggregation jobs
ANALYTICS_AGGREGATION_SCHEDULE="0 * * * *"   # every hour
```

---

## 10. File Structure

```
src/
  analytics/
    analytics.controller.ts
    analytics.service.ts
    analytics.module.ts
    analytics.queue.ts
    dto/
      analytics-query.dto.ts
      track-event.dto.ts
    entities/
      analytics-event.entity.ts
      analytics-aggregation.entity.ts
    workers/
      aggregation.worker.ts
      export.worker.ts
    cache/
      analytics.cache.ts
```
