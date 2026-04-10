# Feature Flags Playbook

This playbook guides the Backend Integrator Agent when implementing feature flag (feature toggle) systems to enable safe, gradual feature rollouts without redeployment.

---

## 1. What to Infer From Frontend

Identify these signals that feature flags are needed:

- **"Beta" / "Early Access" banners**: Features shown to a subset of users.
- **Admin panel with toggle controls**: Internal feature enable/disable.
- **"Coming Soon" placeholders**: Features being developed behind a flag.
- **A/B test experiments**: Show variant A to 50%, variant B to others.
- **Enterprise feature gating**: Some features only for certain plans/orgs.
- **Gradual rollout**: "Release to 10% of users this week, 100% next week."
- **Kill switch requirements**: Ability to disable a feature immediately without deploy.

---

## 2. Feature Flag Types

| Type | Description | Example |
|---|---|---|
| **Release toggle** | Enable/disable a new feature gradually | New checkout flow |
| **Ops toggle** | Kill switch for production incidents | Disable search indexing under load |
| **Experiment toggle** | A/B test different variants | Button color, pricing page copy |
| **Permission toggle** | Gate by plan, role, or org | "Analytics" only on Pro plan |
| **Config toggle** | Control behavior values (not just on/off) | Max upload size per plan |

---

## 3. Implementation Options

| Option | Complexity | Latency | Best For |
|---|---|---|---|
| **Database-backed** | Low | ~10ms (cached) | Most projects |
| **Redis-backed** | Low | ~1ms | High-traffic, real-time updates |
| **Third-party SaaS** (LaunchDarkly, Unleash, PostHog) | Very low | ~1ms SDK | Managed, rich targeting |
| **Environment variables** | Minimal | 0ms | Simple, one-flag scenarios |
| **Config file** | Minimal | 0ms | Non-dynamic, deploy-time only |

**Default recommendation**: Database-backed with Redis caching. Start simple — migrate to a dedicated service if targeting rules become complex.

---

## 4. Required Backend Entities

```
FeatureFlag
  - id
  - key (unique slug: e.g., "new_checkout_flow")
  - name (human-readable)
  - description
  - type: release | ops | experiment | permission | config
  - is_enabled: boolean (global default)
  - rollout_percentage: int (0–100, for gradual rollout)
  - config_value: JSON (for config toggles — e.g., { maxUploadMb: 50 })
  - created_at, updated_at

FeatureFlagOverride
  - id
  - flag_id → FeatureFlag
  - target_type: user | organization | plan
  - target_id (the specific user/org/plan ID)
  - is_enabled: boolean
  - created_at
```

---

## 5. Required API Endpoints

### Admin (internal use only)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /admin/feature-flags | ✅ admin | List all flags |
| POST | /admin/feature-flags | ✅ admin | Create flag |
| PATCH | /admin/feature-flags/:key | ✅ admin | Update flag (enable/disable, % rollout) |
| DELETE | /admin/feature-flags/:key | ✅ admin | Delete flag |
| POST | /admin/feature-flags/:key/overrides | ✅ admin | Add org/user override |
| DELETE | /admin/feature-flags/:key/overrides/:id | ✅ admin | Remove override |

### Client-Facing (optional)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /feature-flags | ✅ | Return all flags relevant to current user |

---

## 6. FeatureFlagService

The core evaluation engine:

```typescript
interface EvaluationContext {
  userId?: string
  organizationId?: string
  planId?: string
}

class FeatureFlagService {
  async isEnabled(key: string, context: EvaluationContext): Promise<boolean>
  async getConfig<T>(key: string, context: EvaluationContext, defaultValue: T): Promise<T>
  async getEnabledFlags(context: EvaluationContext): Promise<Record<string, boolean>>
}
```

### Evaluation Logic

```typescript
async isEnabled(key: string, ctx: EvaluationContext): Promise<boolean> {
  const flag = await this.getFlag(key)         // cache-first
  if (!flag) return false                       // unknown flag = disabled

  // 1. Check specific overrides (highest priority)
  const override = await this.findOverride(flag.id, ctx)
  if (override !== null) return override.isEnabled

  // 2. Check global toggle
  if (!flag.isEnabled) return false

  // 3. Check gradual rollout (deterministic by userId)
  if (flag.rolloutPercentage < 100) {
    return this.isInRollout(ctx.userId, flag.key, flag.rolloutPercentage)
  }

  return true
}

// Deterministic rollout — same user always gets same result
private isInRollout(userId: string, flagKey: string, percentage: number): boolean {
  const hash = crc32(`${userId}:${flagKey}`) % 100
  return hash < percentage
}
```

---

## 7. Caching Strategy

Feature flags are read on almost every request — must be fast:

```typescript
// Cache all flags for 60 seconds
const CACHE_TTL = 60

async getFlag(key: string): Promise<FeatureFlag | null> {
  const cached = await redis.get(`feature-flag:${key}`)
  if (cached) return JSON.parse(cached)

  const flag = await db.featureFlags.findUnique({ where: { key } })
  if (flag) await redis.setex(`feature-flag:${key}`, CACHE_TTL, JSON.stringify(flag))
  return flag
}

// Invalidate on update
async updateFlag(key: string, data: Partial<FeatureFlag>) {
  const flag = await db.featureFlags.update({ where: { key }, data })
  await redis.del(`feature-flag:${key}`)
  return flag
}
```

---

## 8. Usage in Application Code

### Guards / Middleware

```typescript
// NestJS guard
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private flagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.get<string>('feature-flag', context.getHandler())
    if (!flagKey) return true

    const req = context.switchToHttp().getRequest()
    return this.flagService.isEnabled(flagKey, {
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
    })
  }
}

// Usage on controller
@UseGuards(FeatureFlagGuard)
@SetMetadata('feature-flag', 'new_checkout_flow')
@Post('checkout')
async newCheckout() {}
```

### Service Layer Check

```typescript
async processOrder(userId: string, orgId: string, data: OrderDto) {
  const useNewFlow = await this.flagService.isEnabled('new_order_processing', {
    userId, organizationId: orgId
  })

  if (useNewFlow) {
    return this.newOrderService.process(data)
  }
  return this.legacyOrderService.process(data)
}
```

### Frontend Flag Delivery

```typescript
// GET /feature-flags — returns all flags for current user
async getEnabledFlags(ctx: EvaluationContext): Promise<Record<string, boolean>> {
  const flags = await db.featureFlags.findMany({ where: { isEnabled: true } })
  const result: Record<string, boolean> = {}

  for (const flag of flags) {
    result[flag.key] = await this.isEnabled(flag.key, ctx)
  }

  return result
}
// e.g.: { "new_checkout_flow": true, "analytics_v2": false }
```

---

## 9. Plan-Based Feature Gating

For subscription plan gating, use the Permission toggle type:

```typescript
const PLAN_FEATURES: Record<string, string[]> = {
  starter:    ['basic_analytics', 'export_csv'],
  pro:        ['basic_analytics', 'export_csv', 'advanced_analytics', 'webhooks'],
  enterprise: ['*'],   // all features
}

async isPlanFeatureEnabled(featureKey: string, planId: string): Promise<boolean> {
  const features = PLAN_FEATURES[planId] ?? []
  return features.includes('*') || features.includes(featureKey)
}
```

---

## 10. Environment Variables

```bash
# Feature flag cache
REDIS_URL=redis://localhost:6379
FEATURE_FLAG_CACHE_TTL=60          # seconds

# Bootstrap flags (fallback if DB is unavailable)
FEATURE_FLAG_NEW_CHECKOUT=false
FEATURE_FLAG_ANALYTICS_V2=true
```

---

## 11. File Structure

```
src/
  feature-flags/
    feature-flags.module.ts
    feature-flags.service.ts
    feature-flags.controller.ts    ← Admin CRUD + client endpoint
    feature-flags.guard.ts         ← @UseGuards decorator
    feature-flags.decorator.ts     ← @FeatureFlag('key') decorator
    dto/
      create-flag.dto.ts
      update-flag.dto.ts
    entities/
      feature-flag.entity.ts
      feature-flag-override.entity.ts
    helpers/
      rollout.helper.ts            ← Deterministic hash-based rollout
    cache/
      feature-flags.cache.ts
```
