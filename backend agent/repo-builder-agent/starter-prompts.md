# Repo Builder Starter Prompts

Ready-to-use prompts for invoking the `repo-builder` agent using the command syntax.

---

## 1. `/blueprint` — Architecture Plan Only

Use when you want a high-level overview of the repository structure without generating any files.

```markdown
/blueprint

Design the repository architecture for the following project.

Project:
- Name: [e.g., TaskFlow SaaS]
- Type: [monorepo | single-app]

Frontend:
- Framework: [e.g., Next.js]
- Apps: [e.g., dashboard, marketing site]

Backend:
- Framework: [e.g., NestJS]
- Services: [e.g., api, worker]
- Database: [e.g., PostgreSQL + Prisma]

Integrations:
- [e.g., Stripe, S3, SendGrid]

Infrastructure:
- Queue: [e.g., Redis + BullMQ]
- Containerization: [e.g., Docker Compose]
```

---

## 2. `/scaffold` — Generate Config & Skeleton Files

Use when you want the root configuration files, workspace setup, and Docker/CI skeletons.

```markdown
/scaffold

Generate the configuration skeleton for the following project.

Project:
- Name: [e.g., TaskFlow SaaS]
- Repo type: monorepo

Stack:
- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Queue: BullMQ + Redis

Required output:
- package.json (root workspace config)
- tsconfig.base.json
- .env.example
- docker-compose.yml
- .github/workflows/ci.yml
- .gitignore
- SECURITY.md
- .gitleaks.toml
```

---

## 3. `/assemble` — Full Repository Structure

Use when you want the complete repository structure with all apps, packages, infra, and documentation.

```markdown
/assemble

Generate the full production-ready repository for the following project.

Project:
- Name: [e.g., TaskFlow SaaS]
- Description: [brief description]

Frontend:
- Next.js dashboard at apps/web

Backend:
- NestJS API at apps/api
- BullMQ Worker at apps/worker

Shared Packages:
- packages/types (shared TypeScript types)
- packages/sdk (internal API client)
- packages/config (shared config utilities)

Infrastructure:
- PostgreSQL + Redis via Docker Compose
- GitHub Actions CI
- Deployment target: [e.g., Railway / Vercel / AWS]

Include:
- All root config files
- ARCHITECTURE.md with dependency diagram
- README.md and SETUP.md
- SECURITY.md and .gitleaks.toml
- repo-handoff.json
```

---

## 4. `/audit` — Repository Quality Check

Use when you want to validate an existing or proposed repository structure against best practices.

```markdown
/audit

Review the following repository structure against:
- Rule: separation of apps, packages, infra
- Rule: environment variable documentation
- Rule: security baseline (SECURITY.md, .gitleaks.toml, CI security step)
- Rule: Mermaid dependency diagram presence in ARCHITECTURE.md
- Rule: CI/CD skeleton completeness
- Rule: developer onboarding path (README, SETUP)

Repo Structure:
[PASTE YOUR DIRECTORY TREE HERE]
```

---

## 5. `/handoff` — Generate repo-handoff.json

Use when the repository design is complete and you want to produce the structured handoff file for downstream agents or CI validation.

```markdown
/handoff

Generate a repo-handoff.json for the completed repository design.
Validate output against repo-handoff.schema.json.

Project: [Name]
Repo type: [monorepo | single-app]
Frontend: [framework, app names, paths]
Backend: [framework, service names, paths]
Database: [name + ORM]
Integrations: [list with env vars per integration]
Infrastructure: [queue, cache, storage, containerization, CI/CD]
Security baseline: [what was included]
Shared packages: [names, paths, purposes]
Deployment target: [platform]
Assumptions: [list any inferred decisions]
```

---

## General Rules for Agent Responses

When responding to these prompts, the `repo-builder` agent must:
1. **Clarity First**: Every directory must have a clear, predictable purpose.
2. **Stack Alignment**: Config files must match the chosen stack exactly.
3. **Security Mandatory**: Every output must include SECURITY.md, .gitignore, and CI security step.
4. **Handoff Ready**: Always produce a `repo-handoff.json` when invoked with `/handoff`.
5. **Diagram Required**: `ARCHITECTURE.md` must include a Mermaid dependency graph (Rule 23).
6. **No Overengineering**: Monorepo only when multiple apps/services exist.
7. **Developer Path**: A developer must be able to clone → install → run in under 5 minutes.
