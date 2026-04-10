# Stack Guide — Turborepo

Use this guide when the Repo Builder Agent selects **Turborepo** as the monorepo tooling.

---

## When to Use Turborepo

Use Turborepo when:

- The project has **2+ TypeScript/JavaScript apps** (e.g. Next.js + NestJS, or Next.js + Hono)
- Build caching across services is important for CI performance
- Remote caching (Vercel or self-hosted) is available or desirable
- The team is TypeScript-first

Do NOT use Turborepo when:
- The project is a single-app repository
- The backend is Python or Go (Turborepo is JS-ecosystem focused)
- The team has no experience with monorepo tooling and setup complexity is a concern

---

## Required Root Files

```
/
├── turbo.json              ← Turborepo pipeline config
├── package.json            ← Root workspace manifest
├── pnpm-workspace.yaml     ← OR this if using pnpm (recommended)
├── .turbo/                 ← Turbo cache directory (gitignored)
├── apps/
│   ├── web/
│   │   └── package.json
│   ├── api/
│   │   └── package.json
│   └── worker/             ← if background jobs exist
│       └── package.json
└── packages/
    ├── types/
    │   └── package.json
    ├── config/
    │   └── package.json
    └── ui/                 ← if shared UI components exist
        └── package.json
```

---

## turbo.json — Base Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "DATABASE_URL"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
```

---

## Root package.json

```json
{
  "name": "my-project",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:migrate": "turbo run db:migrate --filter=api",
    "db:seed": "turbo run db:seed --filter=api"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## Shared Package — `packages/types`

```json
{
  "name": "@repo/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Consuming apps reference it as:
```json
{
  "dependencies": {
    "@repo/types": "workspace:*"
  }
}
```

---

## Shared Package — `packages/config`

Used for shared TypeScript and ESLint configs.

```
packages/config/
├── package.json
├── tsconfig/
│   ├── base.json
│   ├── nextjs.json
│   └── library.json
└── eslint/
    ├── base.js
    └── nextjs.js
```

---

## TypeScript Base Config

```json
// packages/config/tsconfig/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true
  },
  "exclude": ["node_modules"]
}
```

---

## Remote Caching (Optional)

Enable Vercel Remote Cache:
```bash
pnpm dlx turbo login
pnpm dlx turbo link
```

Or self-host with Ducktape / Turborepo Remote Cache Server.

Add to CI:
```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

---

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Build
  run: turbo run build --filter=...[HEAD^1]

- name: Test
  run: turbo run test --filter=...[HEAD^1]
```

`--filter=...[HEAD^1]` runs tasks only for packages changed since the last commit — critical for large monorepos.

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| All apps rebuild on every commit | Use `--filter` with git range in CI |
| Types not updated across packages | Ensure `@repo/types` has proper exports in `package.json` |
| `workspace:*` not resolving | Must use pnpm as package manager |
| turbo.json `outputs` mismatch | Each app must match its actual build output directory |
| Env vars not in turbo globalEnv | Add all runtime env vars to `globalEnv` or task `env` |

---

## Recommended Node.js Version

- Node.js **≥ 20.0.0** (LTS)
- pnpm **≥ 9.0.0**

Lock these in `package.json` `engines` field and `.nvmrc` / `.node-version`.
