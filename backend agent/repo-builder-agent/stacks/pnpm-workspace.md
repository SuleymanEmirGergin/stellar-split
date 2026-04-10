# Stack Guide — pnpm Workspaces

Use this guide when the Repo Builder Agent uses **pnpm workspaces** as the base for monorepo management (without or before Turborepo).

---

## When to Use pnpm Workspaces

Use pnpm workspaces when:

- The project needs **lightweight monorepo** support without build pipeline complexity
- Turborepo is not needed yet (small project, early stage)
- Shared packages exist but build caching is not critical
- Mixed-language repos where Turborepo doesn't fit

pnpm workspaces can be **combined with Turborepo** — they are not mutually exclusive. pnpm is the package manager; Turborepo is the task runner.

---

## Required Root Files

```
/
├── pnpm-workspace.yaml     ← Workspace definition
├── package.json            ← Root manifest with scripts
├── .npmrc                  ← pnpm settings
├── apps/
│   ├── web/
│   │   └── package.json
│   └── api/
│       └── package.json
└── packages/
    ├── types/
    │   └── package.json
    └── config/
        └── package.json
```

---

## pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

For more complex layouts:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
  - 'infra/*'
```

---

## Root package.json

```json
{
  "name": "my-project",
  "private": true,
  "scripts": {
    "dev": "pnpm run --parallel -r dev",
    "build": "pnpm run -r build",
    "test": "pnpm run -r test",
    "lint": "pnpm run -r lint",
    "install:all": "pnpm install",
    "clean": "find . -name node_modules -type d -prune -exec rm -rf '{}' + && find . -name dist -type d -prune -exec rm -rf '{}' +"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

---

## .npmrc

```ini
# .npmrc
shamefully-hoist=false
strict-peer-dependencies=false
auto-install-peers=true
```

---

## Workspace Dependencies

Referencing internal packages:

```json
{
  "dependencies": {
    "@repo/types": "workspace:*",
    "@repo/config": "workspace:^"
  }
}
```

- `workspace:*` → always uses the local workspace version
- `workspace:^` → respects semver range from local package.json

---

## Running Scripts Across Packages

```bash
# Run in all packages
pnpm run -r build

# Run in a specific package
pnpm --filter api run dev
pnpm --filter web run dev

# Run in parallel
pnpm run --parallel -r dev

# Run in packages affected by changes
pnpm run --filter "...[HEAD^1]" build
```

---

## Installing Dependencies

```bash
# Install to a specific app
pnpm --filter api add express
pnpm --filter web add next react react-dom

# Install dev dep to root
pnpm add -D -w typescript

# Install shared types package
pnpm --filter api add @repo/types
```

---

## Shared Package Structure — `packages/types`

```
packages/types/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

```json
// package.json
{
  "name": "@repo/types",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "require": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/"
  }
}
```

---

## Filtering Examples

```bash
# Only run in apps that depend on @repo/types
pnpm run --filter "...*@repo/types" build

# Run in api and all its dependencies
pnpm run --filter "api..." build

# Run in everything except docs
pnpm run --filter "!docs" test
```

---

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Install
  run: pnpm install --frozen-lockfile

- name: Build
  run: pnpm run --filter "...[HEAD^1]" build

- name: Test
  run: pnpm run --filter "...[HEAD^1]" test
```

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| `workspace:*` not resolving | Ensure `pnpm-workspace.yaml` includes the package path |
| `node_modules` hoisting issues | Set `shamefully-hoist=false` in `.npmrc` |
| Scripts run in wrong order | Use Turborepo or `--sequential` flag |
| Lockfile conflicts | Always commit `pnpm-lock.yaml`, run `pnpm install` after merges |
| Circular dependencies | Check with `madge` or `pnpm why` |

---

## pnpm vs npm vs yarn

| Feature | pnpm | npm | yarn |
|---|---|---|---|
| Disk efficiency | ✅ Content-addressable store | ❌ Duplicates | ⚠️ Moderate |
| Workspace support | ✅ Native | ✅ v7+ | ✅ Berry |
| Speed | ✅ Fast | ⚠️ Moderate | ⚠️ Moderate |
| Turborepo compatibility | ✅ First-class | ✅ Supported | ✅ Supported |
| Phantom deps prevention | ✅ Strict | ❌ | ⚠️ |

**Recommendation:** Use pnpm for all new projects.
