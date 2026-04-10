# Drizzle ORM Stack Guide

ORM-specific patterns, conventions, and gotchas for the Backend Integrator Agent when the project uses Drizzle ORM with Node.js (NestJS, Express, or standalone).

Drizzle is a TypeScript-first ORM with a SQL-like query builder — closer to raw SQL than Prisma, with better performance and no Rust binary dependencies.

---

## 1. When to Choose Drizzle vs Prisma

| Factor | Drizzle | Prisma |
|---|---|---|
| TypeScript experience | Excellent — queries are typed SQL | Excellent — generated types |
| Learning curve | Higher — SQL knowledge required | Lower — auto-generated queries |
| Performance | Faster — no query engine overhead | Slightly slower |
| Bundle size | Smaller — no binary engine | Larger |
| Serverless / Edge | Excellent — no cold start overhead | Good (Accelerate add-on needed) |
| Migrations | Manual SQL or drizzle-kit | Automatic via `prisma migrate` |
| Schema definition | TypeScript file | `.prisma` file |
| Ecosystem maturity | Growing (2023+) | Mature (2019+) |

**Choose Drizzle when**: Edge/serverless, performance-critical, team comfortable with SQL.
**Choose Prisma when**: Rapid prototyping, team less familiar with SQL, need Prisma Studio GUI.

---

## 2. Schema Definition

Drizzle schema is pure TypeScript — no separate DSL file.

```typescript
// src/db/schema/users.ts
import { pgTable, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['user', 'admin', 'owner'])

export const users = pgTable('users', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name:         text('name').notNull(),
  role:         roleEnum('role').notNull().default('user'),
  isVerified:   boolean('is_verified').notNull().default(false),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

---

## 3. Relationships

Drizzle uses `relations()` for type-safe joins — separate from the table definition:

```typescript
// src/db/schema/relations.ts
import { relations } from 'drizzle-orm'
import { users } from './users'
import { memberships } from './memberships'
import { refreshTokens } from './refresh-tokens'

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  refreshTokens: many(refreshTokens),
}))

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
}))
```

---

## 4. Database Connection

### PostgreSQL (with `postgres` driver)

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, {
  max: 10,                  // connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema, logger: process.env.NODE_ENV === 'development' })
export type DB = typeof db
```

### Serverless / Edge (Neon HTTP driver)

```typescript
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

---

## 5. Queries

### Select

```typescript
import { eq, and, ilike, gte, lte, desc, count } from 'drizzle-orm'

// Find by ID
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: { memberships: true },       // eager load with relation
})

// List with filters and pagination
const results = await db
  .select({
    id: products.id,
    name: products.name,
    price: products.price,
  })
  .from(products)
  .where(
    and(
      ilike(products.name, `%${query}%`),
      gte(products.price, minPrice),
      lte(products.price, maxPrice),
      eq(products.isActive, true),
    )
  )
  .orderBy(desc(products.createdAt))
  .limit(limit)
  .offset((page - 1) * limit)
```

### Insert

```typescript
const [newUser] = await db
  .insert(users)
  .values({ email, passwordHash, name })
  .returning()           // returns inserted row
```

### Update

```typescript
const [updated] = await db
  .update(users)
  .set({ name, updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning()
```

### Delete (Soft Delete Pattern)

```typescript
// Soft delete
await db
  .update(products)
  .set({ deletedAt: new Date() })
  .where(eq(products.id, productId))

// Query only active records
const active = await db
  .select()
  .from(products)
  .where(isNull(products.deletedAt))  // import isNull from drizzle-orm
```

---

## 6. Transactions

```typescript
import { db } from './db'

const result = await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values(userData)
    .returning()

  await tx
    .insert(memberships)
    .values({ userId: user.id, organizationId, role: 'owner' })

  return user
})
```

On error, `tx` automatically rolls back.

---

## 7. Pagination

### Offset Pagination

```typescript
async function paginate<T>(
  query: any,
  page: number,
  limit: number
): Promise<{ data: T[]; total: number }> {
  const [data, [{ total }]] = await Promise.all([
    query.limit(limit).offset((page - 1) * limit),
    db.select({ total: count() }).from(/* same table */),
  ])
  return { data, total: Number(total) }
}
```

### Cursor Pagination

```typescript
const items = await db
  .select()
  .from(posts)
  .where(cursor ? lt(posts.createdAt, cursorDate) : undefined)
  .orderBy(desc(posts.createdAt))
  .limit(limit)

const nextCursor = items.length === limit
  ? items[items.length - 1].createdAt.toISOString()
  : null
```

---

## 8. Migrations (drizzle-kit)

```bash
# Install
npm install drizzle-kit --save-dev
```

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

```bash
# Generate migration from schema diff
npx drizzle-kit generate

# Apply migrations to DB
npx drizzle-kit migrate

# View DB in browser GUI
npx drizzle-kit studio

# Push schema changes directly (dev only — no migration file)
npx drizzle-kit push
```

**CI/CD**: Run `npx drizzle-kit migrate` before starting the app.

---

## 9. Full-Text Search (PostgreSQL)

```typescript
import { sql } from 'drizzle-orm'

// Add tsvector column to schema
export const products = pgTable('products', {
  // ...
  searchVector: sql<string>`tsvector`.generatedAlwaysAs(
    sql`to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))`
  ),
}, (table) => ({
  searchIdx: index('products_search_idx').using('gin', table.searchVector),
}))

// Search query
const results = await db
  .select()
  .from(products)
  .where(sql`${products.searchVector} @@ plainto_tsquery('english', ${query})`)
  .orderBy(sql`ts_rank(${products.searchVector}, plainto_tsquery('english', ${query})) DESC`)
```

---

## 10. Common Pitfalls

| Pitfall | Solution |
|---|---|
| Missing `returning()` after insert/update | Always chain `.returning()` to get the record back |
| Forgetting `updatedAt` on updates | Manually set `updatedAt: new Date()` in `.set()` |
| N+1 queries | Use `.with()` in `db.query.*` for eager loading |
| No connection pool config | Set `max`, `idle_timeout` in postgres client |
| Running `drizzle-kit push` in production | Use `drizzle-kit migrate` only |
| Schema and relation files out of sync | Export everything from a single `schema/index.ts` |
| Type errors on nullable fields | Use `isNull()` / `isNotNull()` operators, not `=== null` |

---

## 11. Schema Organization

```
src/
  db/
    index.ts                    ← DB client export
    schema/
      index.ts                  ← Re-exports all tables + relations
      users.ts
      organizations.ts
      memberships.ts
      products.ts
      relations.ts              ← All relations in one file
    migrations/                 ← Generated by drizzle-kit (commit these)
drizzle.config.ts               ← drizzle-kit config (root level)
```

Always export everything from `schema/index.ts`:

```typescript
// src/db/schema/index.ts
export * from './users'
export * from './organizations'
export * from './memberships'
export * from './relations'
```
