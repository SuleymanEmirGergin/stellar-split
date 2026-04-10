# Backend Integrator Starter Prompts

Ready-to-use prompts for invoking the `backend-integrator` agent using the new command syntax.

---

## 1. `/blueprint` — Architecture Only

Use when you need a high-level technical design without any code.

```markdown
/blueprint

Analyze the provided frontend flows and produce the backend architecture.

Frontend Specs:
[PASTE FRONTEND PAGES / FLOWS / FORMS HERE]

Stack Settings (optional):
- Framework: [e.g., NestJS, Fastify]
- Database: [e.g., PostgreSQL]
- ORM: [e.g., Prisma]
```

---

## 2. `/scaffold` — Skeleton Code

Use when you want boilerplate and structure generated.

```markdown
/scaffold

Based on the frontend flows, generate a production-ready backend skeleton.

Frontend Specs:
[PASTE FRONTEND PAGES / FLOWS / FORMS HERE]

Stack Settings:
- Framework: [e.g., NestJS]
- Database: [e.g., PostgreSQL]
- ORM: [e.g., Prisma]
- Auth: [e.g., JWT]
```

---

## 3. `/assemble` — Full Implementation

Use when you want the agent to write actual logic and integrations.

```markdown
/assemble

Transform the frontend specs into a fully functional backend codebase.

Frontend Specs:
[PASTE FRONTEND PAGES / FLOWS / FORMS HERE]

Stack Settings:
- Framework: [e.g., NestJS]
- Database: [e.g., PostgreSQL]
- ORM: [e.g., Prisma]
- Jobs: [e.g., BullMQ]
- Storage: [e.g., S3]
```

---

## 4. `/handoff` — Generate Structured Handoff File

Use when work is complete and you want to produce the `frontend-backend-handoff.json` for the Repo Builder Agent.

```markdown
/handoff

Generate a frontend-backend-handoff.json for the following project.
Validate the output against frontend-backend-handoff.schema.json.

Project Summary:
[PASTE BRIEF PROJECT DESCRIPTION]

Frontend Specs:
[PASTE FRONTEND PAGES / FLOWS / FORMS HERE]
```

---

## 5. `/audit` — Backend Quality Check

Use to validate an existing backend design against security and completeness rules.

```markdown
/audit

Review the following backend design for:
- missing validation rules
- unprotected endpoints
- integration leakage into controllers
- missing rate limiting
- missing error states
- missing observability hooks

Backend Design:
[PASTE ENTITIES / ENDPOINT LIST / MODULE PLAN HERE]
```

---

## General Instructions for Development Agents

When responding to these prompts, the `backend-integrator` agent must:
1. **Contract First**: Always define input/output schemas before logic.
2. **Safety**: Never hardcode secrets; always use environment variables.
3. **Isolation**: External services MUST be placed behind adapter layers.
4. **Validation**: Every frontend field MUST have a corresponding backend validation rule.
5. **Consistency**: Use the same naming conventions as the frontend where applicable.
6. **Handoff**: Always produce a `frontend-backend-handoff.json` when invoked with `/handoff`.
7. **Observability**: Always define structured logging and a `/health` endpoint (Rule 23).

