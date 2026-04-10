# Migration Guide — Prisma ORM → Drizzle ORM

Migrate from Prisma to Drizzle for lighter bundle size, edge runtime compatibility, and SQL-first control.

**When to use this guide:**
- Moving to Cloudflare Workers / Bun / edge runtimes (Prisma client doesn't run in CF Workers)
- Bundle size matters (Drizzle: ~15KB vs Prisma: ~2MB+ with engine binaries)
- You want TypeScript-native SQL without code generation at runtime
- Team prefers SQL-first approach with full type safety

---

## 1. Compatibility Assessment

| Feature | Prisma | Drizzle | Notes |
|---|---|---|---|
| TypeScript support | ✅ | ✅ | Both excellent |
| Schema definition | `.prisma` file | TypeScript file | Drizzle: schema.ts |
| Migrations | `prisma migrate` | `drizzle-kit` | Similar workflow |
| Postgres | ✅ | ✅ | `drizzle-orm/pg-core` |
| MySQL | ✅ | ✅ | `drizzle-orm/mysql-core` |
| SQLite / D1 | ✅ (limited) | ✅ (first-class) | D1 = Drizzle's sweet spot |
| CF Workers | ❌ (no binary) | ✅ | Major win |
| Bun | ⚠️ (partial) | ✅ | |
| Bundle size | ~2MB+ (engine) | ~15KB | |
| Raw SQL | `$queryRaw` | `sql\`\`` | Drizzle more natural |
| Relations | nested queries | `relations()` helper | Different API |
| Transactions | ✅ | ✅ | |
| Connection pooling | ✅ (via env) | via provider | Neon/Supabase handle it |

---

## 2. Installation

```bash
# Remove Prisma
npm remove @prisma/client prisma

# Install Drizzle
npm install drizzle-orm
npm install --save-dev drizzle-kit

# Install driver for your DB
npm install @neondatabase/serverless     # Neon Postgres (edge-compatible)
# OR
npm install postgres                      # pg-compatible, Supabase/Railway
# OR
# D1 driver is built into CF Workers SDK (no install needed)
```

---

## 3. Schema Migration

**Before (Prisma — `prisma/schema.prisma`):**
```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  role      Role      @default(USER)
  createdAt DateTime  @default(now())
  posts     Post[]
}

model Post {
  id        String   @id @default(cuid())
  title     String
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
}

enum Role {
  USER
  ADMIN
}
```

**After (Drizzle — `src/db/schema.ts`):**
```typescript
import { pgTable, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['USER', 'ADMIN']);

export const users = pgTable('users', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:     text('email').notNull().unique(),
  name:      text('name'),
  role:      roleEnum('role').default('USER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:     text('title').notNull(),
  published: boolean('published').default(false).notNull(),
  authorId:  text('author_id').notNull().references(() => users.id),
});

// Optional: define relations for join helper
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

**D1 (SQLite) schema:** replace `pgTable` with `sqliteTable`, `text/boolean/timestamp` with SQLite equivalents:
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  email:     text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

---

## 4. Database Client Setup

**Before (Prisma — `src/lib/db.ts`):**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

**After (Drizzle — `src/lib/db.ts`):**

For **Neon/Supabase (edge-compatible HTTP):**
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function getDb(dbUrl: string) {
  const sql = neon(dbUrl);
  return drizzle(sql, { schema });
}

// In Hono route: const db = getDb(c.env.DATABASE_URL);
```

For **Node.js / Railway (TCP):**
```typescript
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

For **Cloudflare D1:**
```typescript
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// In Hono route: const db = getDb(c.env.DB);
```

---

## 5. Query Migration

### Find one by ID:
```typescript
// Prisma
const user = await prisma.user.findUnique({ where: { id } });

// Drizzle
const [user] = await db.select().from(users).where(eq(users.id, id));
// OR with query builder (if relations defined):
const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, id) });
```

### Create:
```typescript
// Prisma
const user = await prisma.user.create({ data: { email, name } });

// Drizzle
const [user] = await db.insert(users).values({ id: crypto.randomUUID(), email, name }).returning();
```

### Update:
```typescript
// Prisma
const user = await prisma.user.update({ where: { id }, data: { name } });

// Drizzle
const [user] = await db.update(users).set({ name }).where(eq(users.id, id)).returning();
```

### Delete:
```typescript
// Prisma
await prisma.user.delete({ where: { id } });

// Drizzle
await db.delete(users).where(eq(users.id, id));
```

### With relations (join):
```typescript
// Prisma
const users = await prisma.user.findMany({ include: { posts: true } });

// Drizzle — query builder (requires relations defined above)
const result = await db.query.users.findMany({ with: { posts: true } });

// Drizzle — explicit join
const result = await db
  .select({ user: users, post: posts })
  .from(users)
  .leftJoin(posts, eq(posts.authorId, users.id));
```

### Transaction:
```typescript
// Prisma
await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.post.create({ data: postData }),
]);

// Drizzle
await db.transaction(async (tx) => {
  await tx.insert(users).values(userData);
  await tx.insert(posts).values(postData);
});
```

---

## 6. Migrations

**Drizzle Kit config (`drizzle.config.ts`):**

For Postgres:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema:    './src/db/schema.ts',
  out:       './drizzle',
  dialect:   'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

For D1:
```typescript
export default defineConfig({
  schema:  './src/db/schema.ts',
  out:     './drizzle',
  dialect: 'd1-http',
  driver:  'd1-http',
  dbCredentials: {
    accountId:  process.env.CF_ACCOUNT_ID!,
    databaseId: process.env.CF_D1_ID!,
    token:      process.env.CF_API_TOKEN!,
  },
});
```

**Migration commands:**
```bash
# Generate migration SQL
npx drizzle-kit generate

# Push schema directly to dev DB (no migration file)
npx drizzle-kit push

# Apply migrations in production
npx drizzle-kit migrate

# D1 (local dev via wrangler)
npx wrangler d1 migrations apply <DB_NAME> --local
```

---

## 7. Migration Checklist

```
[ ] Remove @prisma/client, prisma from package.json
[ ] Remove prisma/schema.prisma and prisma/ directory
[ ] Install drizzle-orm + drizzle-kit + appropriate driver
[ ] Convert schema.prisma to schema.ts using pgTable/sqliteTable
[ ] Convert PrismaClient singleton to drizzle + driver factory
[ ] Rewrite findUnique → select().where(eq())
[ ] Rewrite create → insert().values().returning()
[ ] Rewrite update → .set().where().returning()
[ ] Rewrite $transaction → db.transaction(tx => ...)
[ ] Update drizzle.config.ts with dialect + dbCredentials
[ ] Run drizzle-kit generate to produce migration SQL
[ ] Update CI: replace prisma migrate deploy with drizzle-kit migrate
[ ] If CF Workers: verify NO Prisma binary remains in bundle
```
