# Caching Playbook

This playbook guides the Backend Integrator Agent when implementing caching strategies to improve performance and reduce database load.

---

## 1. What to Infer From Frontend

Identify these UI patterns that imply caching is needed:

- **Dashboard / Home Page with expensive data**: KPI cards, analytics summaries — high read, low write.
- **Product Listings / Search Results**: Same queries run repeatedly by many users.
- **Autocomplete / Typeahead**: Must respond in < 100ms — database alone is too slow.
- **Public content pages**: Blog posts, landing page data — same response for every user.
- **Rate-limited integrations**: Third-party API calls (exchange rates, weather, IP geo) — cache reduces costs.
- **Session / Auth data**: Repeated JWT validation lookups — cache reduces DB reads.
- **Configuration / Feature Flags**: App config queried on every request — should be in memory.

---

## 2. Caching Strategies

Choose the correct pattern based on the data characteristics:

| Strategy | How It Works | When to Use |
|---|---|---|
| **Cache-Aside** | App reads cache; on miss, reads DB, populates cache | Default pattern for most cases |
| **Write-Through** | App writes to DB and cache simultaneously | When cache data must always be fresh |
| **Write-Behind** | App writes to cache; async flush to DB | High write throughput, eventual consistency acceptable |
| **Read-Through** | Cache fetches from DB automatically on miss | ORM-level caching (e.g., Redis + Prisma) |
| **Cache-Busting** | Invalidate cache when data changes | Entities with infrequent writes |

**Default recommendation**: Cache-Aside with explicit TTL and cache-busting on mutations.

---

## 3. TTL Strategy

Define TTL (time-to-live) based on data freshness requirements:

| Data Type | TTL | Rationale |
|---|---|---|
| User session | 15 min | Matches access token expiry |
| Dashboard KPIs | 5 min | Slightly stale is acceptable |
| Product listings | 2 min | Balances freshness vs performance |
| Autocomplete suggestions | 15 min | Changes infrequently |
| Config / feature flags | 60 min | Rarely changed |
| Exchange rates / external API | 30 min | Provider limitation |
| Per-user data | Session lifetime | Invalidate on data change |

---

## 4. Cache Key Design

Keys must be deterministic, namespaced, and version-safe:

```
Format: {namespace}:{version}:{identifier}:{params}

Examples:
  products:v1:list:page=1:limit=24:category=electronics
  user:v1:profile:user_123
  analytics:v1:summary:org_456:2024-03
  suggest:v1:products:lap
```

**Rules:**
- Include a version prefix — allows global cache invalidation by bumping `v1` → `v2`
- Include all parameters that affect the result
- Avoid unbounded key growth — limit param combinations in suggest endpoints

---

## 5. Cache Invalidation Patterns

### 1. TTL-Based (passive expiry)
Data expires automatically. No explicit invalidation needed.
Best for: public data, eventually-consistent results.

### 2. Event-Driven (active invalidation)
When an entity is mutated, delete its cache key:

```typescript
// After updating a product
await cacheService.del(`products:v1:detail:${productId}`)
await cacheService.del(`products:v1:list:*`)   // pattern delete
```

### 3. Tag-Based Invalidation
Group cache entries by tags, invalidate the whole group:

```typescript
await cacheService.setWithTags(key, value, ttl, tags: ['products'])
// Later:
await cacheService.invalidateTag('products')
```

### 4. Version Bump (nuclear option)
Change the global version prefix to invalidate all cache:
```
products:v1:* → products:v2:*
```

---

## 6. What NOT to Cache

| Data | Reason |
|---|---|
| Passwords / secrets | Security — never store in cache |
| Financial transactions | Must always be real-time |
| Per-request randomized data | No cache benefit |
| Data with strict consistency requirements | Cache-aside introduces lag |
| Write-heavy entities (updated every second) | Cache churn, no benefit |

---

## 7. Cache Service Interface

Always wrap Redis behind a service — never call Redis directly in controllers:

```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
  delPattern(pattern: string): Promise<void>      // SCAN + DEL
  remember<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<T>
}

// Usage (Cache-Aside in one line)
const products = await cacheService.remember(
  `products:v1:list:${JSON.stringify(filters)}`,
  120,
  () => productsRepo.findAll(filters)
)
```

---

## 8. Redis Data Structures

Choose the right Redis type for the job:

| Use Case | Redis Type | Example |
|---|---|---|
| Simple key-value cache | `STRING` + `EX` | Product detail, user profile |
| Real-time counters | `INCR` / `DECR` | Page views, API rate limits |
| Leaderboards / sorted results | `ZSET` | Top products by score |
| Unique visitor counts | `HyperLogLog` | Daily active users |
| Pub/Sub for cache events | `PUBLISH/SUBSCRIBE` | Cache invalidation broadcasts |
| Distributed locks | `SET NX PX` | Prevent duplicate job processing |

---

## 9. Distributed Lock Pattern

Prevent race conditions in cache population:

```typescript
const lockKey = `lock:products:list:${cacheKey}`
const acquired = await redis.set(lockKey, '1', 'NX', 'PX', 5000)

if (!acquired) {
  // Another instance is populating — wait briefly and retry
  await sleep(100)
  return cacheService.get(cacheKey)
}

try {
  const data = await db.fetchExpensiveData()
  await cacheService.set(cacheKey, data, ttl)
  return data
} finally {
  await redis.del(lockKey)
}
```

---

## 10. Performance Targets

Define these before implementation:

| Metric | Target |
|---|---|
| Cache hit ratio | ≥ 80% for hot endpoints |
| Cached response time | < 10ms |
| Uncached (DB) response time | < 200ms |
| Cache memory limit | Set `maxmemory` in Redis config |
| Eviction policy | `allkeys-lru` for general caching |

---

## 11. Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password       # if auth enabled
REDIS_TLS=false                    # true for production managed Redis

# Cache config
CACHE_DEFAULT_TTL=300              # 5 minutes fallback TTL
CACHE_MAX_MEMORY=256mb             # per Redis config
CACHE_VERSION=v1                   # bump to invalidate all cache
```

---

## 12. File Structure

```
src/
  cache/
    cache.module.ts
    cache.service.ts               ← Implements CacheService interface
    cache.service.spec.ts
    adapters/
      redis.adapter.ts             ← Wraps ioredis / redis client
    decorators/
      cacheable.decorator.ts       ← Optional: @Cacheable(key, ttl)
      cache-evict.decorator.ts     ← Optional: @CacheEvict(key)
```
