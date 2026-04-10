# Search & Discovery Playbook

This playbook guides the Backend Integrator Agent when implementing search, filtering, and discovery systems derived from frontend UI flows.

---

## 1. What to Infer From Frontend

Identify these UI elements to determine the scope of the search system:

- **Search Bar / Input**: Basic keyword search — implies full-text search capability.
- **Filter Panels**: Sidebar or dropdown filters — implies structured field-based filtering.
- **Sort Controls**: "Sort by: Price / Date / Relevance" — implies sortable result sets.
- **Autocomplete / Typeahead**: Live suggestions as user types — implies a fast, lightweight suggest endpoint.
- **Faceted Search**: "Category: Electronics (24)" style counts — implies aggregation.
- **"No results" State**: Always requires a fallback strategy (fuzzy match, did-you-mean).
- **Advanced Search / Filters Page**: Multiple combined criteria — implies complex query builder.

---

## 2. Search Strategy Selection

Choose the right approach based on complexity and scale:

| Strategy | When to Use | Tooling |
|---|---|---|
| **SQL Full-Text Search** | Simple search on small-to-medium tables | PostgreSQL `tsvector` / `tsquery` |
| **LIKE / ILIKE** | Simple substring match, very small datasets | Any SQL DB |
| **Dedicated Search Engine** | Large volumes, complex ranking, fuzzy matching | Elasticsearch, OpenSearch, Typesense |
| **External Search SaaS** | Managed solution, rapid integration | Algolia, Meilisearch |

**Default recommendation**: Start with PostgreSQL full-text search. Migrate to a dedicated engine only when query complexity or volume demands it.

---

## 3. Required Backend Entities / Structures

### PostgreSQL Full-Text (Pattern A)

Add a generated column to the target entity:

```sql
ALTER TABLE products
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
) STORED;

CREATE INDEX idx_products_search ON products USING GIN(search_vector);
```

### Dedicated Search Engine (Pattern B)

```
SearchIndex (external)
  - id (maps to entity primary key)
  - indexed fields (name, description, tags, etc.)
  - last_indexed_at
```

Maintain a sync job that propagates entity changes to the search index.

---

## 4. Required API Endpoints

### Primary Search
- `GET /search` — Universal search across one or more entity types
  - Query params: `q`, `type`, `page`, `limit`, `sort`, `filters`
- `GET /:entity/search` — Entity-scoped search (e.g., `GET /products/search`)

### Autocomplete / Suggest
- `GET /search/suggest` — Returns top 5–10 suggestions for typeahead
  - Query params: `q`, `type`
  - Response: lightweight (id, name, thumbnail only)

### Faceted Counts (optional)
- `GET /search/facets` — Returns filter option counts
  - Query params: same filters as main search

---

## 5. Filtering Architecture

Standardize the filter query interface:

```
GET /products/search
  ?q=laptop
  &category=electronics
  &price_min=500
  &price_max=2000
  &in_stock=true
  &sort=price_asc
  &page=1
  &limit=24
```

Build a `SearchQueryBuilder` service that maps these params to SQL conditions or engine filters — never write raw filter logic in controllers.

---

## 6. Pagination Strategy

| Pattern | When to Use |
|---|---|
| **Offset Pagination** (`page`, `limit`) | Default case, simple admin tables |
| **Cursor Pagination** (`cursor`, `limit`) | Infinite scroll, real-time data, large datasets |

For search results, offset pagination is typically acceptable. For live feeds, use cursor.

---

## 7. Performance Considerations

| Problem | Solution |
|---|---|
| Full-text search slow on large tables | GIN index on `tsvector` column |
| Autocomplete latency | Redis-cached top suggestions, refreshed every 15 min |
| Complex facet counts slow | Pre-aggregate facets on a schedule |
| Search index drift | CDC (Change Data Capture) or entity lifecycle hooks |
| N+1 problem on results | Eager-load relations in the search query |

---

## 8. Search Index Sync (Pattern B)

When using a dedicated search engine, keep the index in sync:

```
Option A — Realtime sync: Entity service emits event → search sync job → index update
Option B — Scheduled sync: Cron job → scan entities updated since last_indexed_at → batch index
```

Always prefer Option A for freshness. Use Option B as a safety net reconciliation job.

---

## 9. Environment Variables

```bash
# PostgreSQL (full-text included in DATABASE_URL)
DATABASE_URL=postgresql://...

# Dedicated Search Engine (if applicable)
SEARCH_PROVIDER=typesense          # typesense | algolia | elasticsearch
TYPESENSE_API_KEY=your_key
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108

# Algolia (alternative)
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_api_key
ALGOLIA_INDEX_NAME=products

# Cache
REDIS_URL=redis://localhost:6379
SEARCH_SUGGEST_CACHE_TTL=900       # seconds
```

---

## 10. File Structure

```
src/
  search/
    search.controller.ts
    search.service.ts
    search.module.ts
    dto/
      search-query.dto.ts
      search-result.dto.ts
    builders/
      search-query.builder.ts     ← Maps filter params to DB/engine queries
    adapters/
      search.adapter.interface.ts
      postgres-search.adapter.ts
      typesense.adapter.ts
    cache/
      search-suggest.cache.ts
    workers/
      search-sync.worker.ts       ← Keeps external index up to date
```
