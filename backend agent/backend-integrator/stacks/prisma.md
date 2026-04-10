# Prisma Stack Guide

ORM-specific patterns, conventions, and gotchas for the Backend Integrator Agent when the project uses Prisma with any Node.js framework (NestJS, Express, Fastify).

---

## 1. Schema Design

Prisma schemas live in `prisma/schema.prisma`.

### Basic Model Pattern

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  posts     Post[]
  sessions  RefreshToken[]

  @@index([email])
}

enum Role {
  USER
  ADMIN
  OWNER
}
```

### ID Strategy

| Strategy | Use When |
|---|---|
| `@default(uuid())` | Need globally unique IDs, expose to external systems |
| `@default(cuid())` | Need URL-safe IDs, better collision resistance |
| `@default(autoincrement())` | Internal tables, not exposed in URLs, need sequential ordering |

**Rule**: Never expose `autoincrement()` IDs in public API routes. Use `cuid()` or `uuid()` for user-facing entities.

---

## 2. Relationships

### One-to-Many

```prisma
model Organization {
  id      String @id @default(cuid())
  members Membership[]
}

model Membership {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Many-to-Many (implicit)

```prisma
model Product {
  id         String     @id @default(cuid())
  categories Category[]
}

model Category {
  id       String    @id @default(cuid())
  products Product[]
}
```

### Many-to-Many (explicit — with extra fields)

```prisma
model ProductCategory {
  product   Product  @relation(fields: [productId], references: [id])
  productId String
  category  Category @relation(fields: [categoryId], references: [id])
  categoryId String
  sortOrder  Int @default(0)

  @@id([productId, categoryId])
}
```

---

## 3. Indexes

Always define indexes for:
- Foreign keys (Prisma does NOT auto-index FK columns in PostgreSQL)
- Frequently filtered columns
- Composite filters used together

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  actorId        String?
  entityType     String
  action         String
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([organizationId, entityType])
  @@index([organizationId, createdAt])
  @@index([actorId])
}
```

---

## 4. Soft Deletes

Prisma has no built-in soft delete. Implement consistently:

```prisma
model Product {
  id        String    @id @default(cuid())
  name      String
  deletedAt DateTime? // null = active, timestamp = deleted

  @@index([deletedAt])
}
```

Query helpers:

```typescript
// Only active records
const active = await prisma.product.findMany({
  where: { deletedAt: null }
})

// Soft delete
await prisma.product.update({
  where: { id },
  data: { deletedAt: new Date() }
})
```

Consider using [prisma-soft-delete-middleware](https://github.com/olivierwilkinson/prisma-soft-delete-middleware) to apply this automatically.

---

## 5. Transactions

### Sequential (most common)

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData })
  await tx.membership.create({ data: { userId: user.id, organizationId } })
  return user
})
```

### Interactive (with external calls inside)

```typescript
const [user, org] = await prisma.$transaction([
  prisma.user.findUnique({ where: { id: userId } }),
  prisma.organization.findUnique({ where: { id: orgId } }),
])
```

**Rule**: Always use transactions for operations that modify more than one table.

---

## 6. Pagination

### Offset Pagination

```typescript
async function paginate<T>(
  model: any,
  where: object,
  page: number,
  limit: number
) {
  const [data, total] = await prisma.$transaction([
    model.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    model.count({ where }),
  ])
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
}
```

### Cursor Pagination (infinite scroll)

```typescript
const items = await prisma.post.findMany({
  take: limit,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
})
const nextCursor = items.length === limit ? items[items.length - 1].id : null
```

---

## 7. Select & Include (Performance)

Never fetch columns you don't need:

```typescript
// BAD — fetches all columns including password_hash
const user = await prisma.user.findUnique({ where: { id } })

// GOOD — select only what the response needs
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true, role: true }
})
```

Use `include` for relations, `select` for projection. Nest them:

```typescript
const org = await prisma.organization.findUnique({
  where: { id },
  include: {
    members: {
      select: { role: true, user: { select: { id: true, name: true, email: true } } }
    }
  }
})
```

---

## 8. Migrations

```bash
# Development — generate migration from schema diff
npx prisma migrate dev --name add_audit_logs

# Production — apply pending migrations
npx prisma migrate deploy

# Inspect DB state vs schema
npx prisma migrate status

# Generate Prisma Client after schema change
npx prisma generate
```

**CI/CD Rule**: Run `npx prisma migrate deploy` as part of the deployment step, before starting the application.

---

## 9. Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.role.createMany({
    data: [{ name: 'admin' }, { name: 'user' }],
    skipDuplicates: true,
  })
}

main().finally(() => prisma.$disconnect())
```

```json
// package.json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

```bash
npx prisma db seed
```

---

## 10. PrismaService (NestJS / Express)

```typescript
// prisma.service.ts (NestJS)
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }
}

// prisma.ts (Express / standalone)
import { PrismaClient } from '@prisma/client'

declare global { var prisma: PrismaClient | undefined }

export const prisma = global.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') global.prisma = prisma
```

---

## 11. Common Pitfalls

| Pitfall | Solution |
|---|---|
| Missing FK indexes | Manually add `@@index` for all FK columns |
| `findMany()` without pagination | Always use `take` + `skip` or cursor |
| Selecting `password_hash` in API responses | Use `select` to exclude sensitive fields |
| Forgetting `npx prisma generate` after schema change | Add to `postinstall` script |
| Transactions for multi-table mutations | Always use `prisma.$transaction()` |
| N+1 query problem | Use `include` with nested `select` instead of sequential queries |
| Hard delete instead of soft delete | Add `deletedAt DateTime?` to user-facing entities |
| Running migrations manually in production | Use `prisma migrate deploy` in CI/CD |

---

## 12. Useful Extensions

| Tool | Purpose |
|---|---|
| `prisma-soft-delete-middleware` | Auto-applies soft delete filter globally |
| `@prisma/extension-accelerate` | Connection pooling for serverless |
| `zod-prisma-types` | Auto-generates Zod schemas from Prisma models |
| `prisma-pagination` | Utility for offset pagination |
