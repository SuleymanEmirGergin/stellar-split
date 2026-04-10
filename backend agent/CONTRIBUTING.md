# Contributing Guide

This document defines how to extend, maintain, and improve the Backend Agent System.
Read this before adding new playbooks, modifying rules, updating schemas, or adding stack guides.

---

## What Is the Backend Agent System?

A two-agent framework for designing and scaffolding production-ready backends:

- **Backend Integrator** — converts frontend flows into backend architecture
- **Repo Builder** — converts architecture into a repository structure

Every file in this system is an input that an AI agent reads to make better decisions.
Quality, consistency, and clarity of these files directly impacts agent output quality.

---

## Directory Layout

```
backend agent/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md              ← You are here
├── pipeline.md
│
├── backend-integrator/
│   ├── agent.md                 ← Agent identity and commands
│   ├── system-prompt.md         ← Primary AI instruction file
│   ├── rules.md                 ← Mandatory constraints
│   ├── skill.md                 ← Skill declaration
│   ├── starter-prompts.md       ← User-facing prompt templates
│   ├── starter-playbooks.md     ← Playbook index
│   ├── examples.md              ← Worked examples
│   ├── frontend-backend-handoff.schema.json
│   ├── playbooks/               ← Domain playbooks
│   ├── stacks/                  ← Framework-specific guides
│   └── checklists/              ← Quality checklists
│
└── repo-builder-agent/
    ├── agent.md
    ├── system-prompt.md
    ├── rules.md
    ├── skill.md
    ├── starter-prompts.md
    ├── examples.md
    ├── repo-handoff.schema.json
    └── deployments/             ← Platform deployment guides
```

---

## How to Add a New Playbook

Playbooks are domain-specific implementation guides used by the Backend Integrator.

### 1. Create the file

```
backend-integrator/playbooks/<topic>.md
```

### 2. Follow this structure (mandatory)

All playbooks use a **10–12 section format**. Sections 1, 2, and the final 3 sections are mandatory. Middle sections (3–9) are domain-specific.

```markdown
# <Topic> Playbook

One-line description.

---

## 1. What to Infer From Frontend
What UI elements, entity names, or project notes trigger this playbook. Be specific.
List concrete signals (e.g., "form contains `ssn` field", "page named AdminPanel").

## 2. <Core Strategy or Concepts>
The primary decision or design choice this playbook makes.
(e.g., "Encryption Strategy", "Log Pipeline Design", "Compliance Tier Selection")

## 3–8. <Domain-Specific Sections>
Each section covers one implementation concern. Examples:
- Data Classification (compliance.md)
- Field-Level Encryption (security.md)
- Structured Logging Setup (observability.md)
- Health Check Design (observability.md)
- Retention Policy (compliance.md)
- Incident Response (compliance.md)

Keep each section to one concern. Do not combine unrelated implementation details.

## 9. Required API Endpoints
Use a table: Method | Route | Auth | Roles | Summary

## 10. Environment Variables
Code block with all required env vars, grouped by concern, with example values.

## 11. Security Rules (this playbook's domain)
Bullet list of non-negotiable constraints. Use imperative: "All X must be Y."
Mark any item that causes blocking validation failure with **(blocking)**.

## 12. File Structure
Directory tree showing where all generated files live.
Annotate each file with its purpose using ← comments.
```

**Minimum section count:** 10. **Maximum:** 12.
Sections 3–8 may be collapsed if the domain is narrow (minimum 10 total). Do not add sections for content that belongs in another playbook.

### 3. Register in `starter-playbooks.md`

Add an entry to the **Domain Playbooks** table:
```markdown
### N. [Title](./playbooks/<topic>.md)
- **Purpose**: One line.
- **Trigger**: What frontend signals activate this.
- **Components**: Key entities, adapters, workers.
```

### 4. Update `CHANGELOG.md`

Add an entry under a new minor version (`X.Y.0`):
```markdown
### Added
- `playbooks/<topic>.md` — Brief description
```

---

## How to Add a New Stack Guide

Stack guides are framework-specific implementation patterns.

### 1. Create the file

```
backend-integrator/stacks/<framework>.md
```

### 2. Follow this structure (mandatory)

Stack guides use an **11 section format**. All sections are mandatory.

```markdown
# <Framework> Stack Guide

One-line description of the framework and its primary use case.

---

## 1. Project Structure
Recommended directory layout as an annotated code block.

## 2. Validation (DTOs / Schemas)
How to validate request bodies. Include a code example.

## 3. Dependency Injection / Middleware
How to apply auth guards, role checks, and custom middleware.

## 4. Database Access (ORM)
How to write queries and manage connections. Show a real query pattern.

## 5. Migrations
How to generate and run migrations. Include CLI commands.

## 6. Background Jobs
Queue/worker integration. Show how to enqueue and consume.

## 7. Error Handling
Global error handler pattern with custom error classes.

## 8. Security Defaults
Framework-specific security configuration:
- Security headers (Helmet or equivalent)
- CORS configuration
- Rate limiting
- Any framework-specific auth integration notes

## 9. Config Management
How to validate environment variables at startup using Zod or equivalent.

## 10. Testing Setup
Unit test and integration test patterns with code examples.

## 11. Common Pitfalls
Table: Pitfall | Solution
```

**Section 8 (Security Defaults) is new** — added in v3.4.0. All stack guides must document framework-specific security configuration. Do not merge security content into other sections.

### 3. Register in `starter-playbooks.md`

Add under the **Stack Guides** section.

### 4. Update `CHANGELOG.md`

```markdown
### Added
- `stacks/<framework>.md` — Brief description
```

---

## How to Add a Checklist

### 1. Create the file

```
backend-integrator/checklists/<name>.md
```

### 2. Follow this structure

```markdown
# <Name> Checklist

Purpose and when to use it.

---

## 1. <Section Name>
- [ ] Actionable, specific item
- [ ] Another item

...

## Scoring
When the checklist passes / fails.
```

### 3. Register in `starter-playbooks.md`

Add to the **Checklists** table.

---

## How to Modify Agent Rules

Rules in `rules.md` are mandatory constraints. Any modification has direct impact on agent behavior.

### Adding a New Rule

1. Append to `rules.md` with the next sequential number (e.g., Rule 24).
2. Use this format:

```markdown
# 24. Rule Title

One-sentence summary.

Rules:
- Specific, testable constraint.
- Another constraint.
```

3. Update `system-prompt.md` to reference the new rule where applicable (Thinking Model or Output Structure).
4. Update `agent.md` if the rule adds a new command or output requirement.
5. Update `CHANGELOG.md`.

### Modifying an Existing Rule

- Only modify if the rule is incorrect, outdated, or creating agent confusion.
- Do not soften rules — tighten them where possible.
- Always document the change in `CHANGELOG.md`.

---

## How to Update the Handoff Schema

The handoff schemas are machine-readable contracts. Changes must be backward-compatible unless it is a major version.

### Versioning

| Change Type | Version Bump |
|---|---|
| Add optional field | Patch (Z) |
| Add required field | Minor (Y) — requires updating examples.md |
| Remove or rename field | Major (X) — breaking change |
| Change field type | Major (X) — breaking change |

### Steps

1. Edit the `.schema.json` file.
2. Update `schemaVersion` in the `meta` object.
3. Update `examples.md` to show a valid sample against the new schema.
4. Update `CHANGELOG.md`.

---

## How to Update the Pipeline

`pipeline.md` defines the orchestration protocol between agents.

- Update when a new command is added to either agent.
- Update when a new handoff schema is introduced.
- Always keep the command compatibility matrix current.

---

## Writing Style Rules

All files in this system are read by AI agents. Writing style has direct impact on output quality.

| Rule | Rationale |
|---|---|
| Use imperative mood | "Define X" not "X should be defined" |
| Prefer tables over prose for comparisons | Easier for agents to parse patterns |
| Use code blocks for all schemas and examples | Prevents ambiguity |
| Keep headings hierarchical and predictable | Agents use structure for context |
| Never use vague adjectives | "Validate all inputs" not "Make sure inputs are okay" |
| Be explicit about what is mandatory vs optional | Use bold or rule callouts |
| One concept per section | Avoid combining unrelated ideas |

---

## Versioning Policy

This system follows [Semantic Versioning](https://semver.org/):

| Change | Version |
|---|---|
| Breaking schema change or removed rule | **Major** (X.0.0) |
| New playbook, stack guide, checklist, or command | **Minor** (X.Y.0) |
| Correction, clarification, or typo fix | **Patch** (X.Y.Z) |

Always update `CHANGELOG.md` before marking a version complete.

---

## Quality Standards

Before submitting any change, verify:

- [ ] The file follows the mandatory structure for its type.
- [ ] All code blocks are syntactically valid.
- [ ] All cross-references (links to other files) are correct.
- [ ] `CHANGELOG.md` has been updated.
- [ ] `starter-playbooks.md` has been updated (for playbooks/stacks/checklists).
- [ ] No vague language — every statement is specific and actionable.
- [ ] The agent can read and apply this content without ambiguity.
