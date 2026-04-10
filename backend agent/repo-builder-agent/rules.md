# Repo Builder Agent Rules

These rules define the mandatory constraints for the Repo Builder Agent when generating repository structures.

The agent must follow these rules when converting architecture outputs into a repository layout.

---

# 1. Repository Clarity

A repository structure must be clear and predictable.

Rules:

- applications must live in an `apps/` directory
- reusable code must live in `packages/`
- infrastructure must live in `infra/`
- documentation must live in `docs/`

Never mix infrastructure and application code in the same directories.

---

# 2. App Separation

If the system includes multiple services, they must be separated.

Examples:

apps/
web/
api/
worker/

Rules:

- frontend must not live inside backend directories
- background workers must be isolated
- services must not share runtime code directly

Shared logic should live in packages.

---

# 3. Shared Packages

Shared logic must not be duplicated.

Detect when shared packages are needed:

Examples:

- shared types
- shared API client
- shared UI components
- shared config

Place these in:

packages/

Example:

packages/
types/
ui/
config/
sdk/

---

# 4. Environment Variable Discipline

Every service must define its environment variables.

The repository must contain:

.env.example

Optionally:

.env.development
.env.production

Rules:

- secrets must never be hardcoded
- env variables must be grouped logically
- each service should document required variables

---

# 5. Infrastructure Isolation

Infrastructure files must live in a dedicated directory.

Example:

infra/
docker/
scripts/
terraform/

Never mix infrastructure files inside application directories.

---

# 6. Containerization Awareness

If the project includes backend services, a containerization strategy must be proposed.

Minimum requirement:

Dockerfile for backend service.

Prefer including:

docker-compose.yml for local development.

Typical services:

- database
- cache
- queue
- api
- worker

---

# 7. Database and Migrations

If the backend uses a database:

- migration system must be defined
- migration scripts must have a location
- seed scripts should be proposed

Examples:

prisma/
migrations/

or

db/
migrations/

---

# 8. Development Scripts

The repository must define development scripts.

Examples:

- install dependencies
- start development server
- build project
- run tests
- run lint
- format code
- run migrations
- seed database

Scripts should live in:

package.json or task runner configs.

---

# 9. CI/CD Skeleton

A repository must contain a CI pipeline skeleton.

Default option:

.github/workflows/ci.yml

CI should include steps such as:

- install dependencies
- run lint
- run tests
- build project

Even minimal CI is better than none.

---

# 10. Documentation Requirements

Every generated repository must include documentation.

Required files:

README.md  
SETUP.md  
ARCHITECTURE.md  

These must explain:

- repository structure
- development setup
- environment variables
- how to run services locally

---

# 11. Worker Detection

If the backend architecture includes background jobs:

- define a worker service
- separate worker runtime from API runtime

Example:

apps/
api/
worker/

Workers should not run inside the API process.

---

# 12. Queue Awareness

If background jobs exist:

a queue system must be proposed.

Examples:

- Redis + BullMQ
- RabbitMQ
- Kafka

The infrastructure setup must reflect the queue system.

---

# 13. Avoid Overengineering

Do not introduce unnecessary complexity.

Rules:

- small projects may remain single app repos
- monorepos should only be used when multiple apps/services exist
- avoid creating packages without clear purpose

---

# 14. Naming Consistency

Use consistent naming conventions.

Examples:

apps/
web/
api/
worker/

packages/
ui/
types/
sdk/

Avoid inconsistent names.

---

# 15. Implementation Completeness

A repository design is not complete unless it includes:

- repository structure
- apps and services
- shared packages
- environment configuration
- infrastructure setup
- development scripts
- CI skeleton
- documentation files
- implementation order

---

# 16. Assumption Transparency

If stack or infrastructure details are missing:

- infer conservatively
- clearly state assumptions
- avoid speculative tools or frameworks

---

# 17. Developer Experience

The generated repository must be easy for developers to run.

A developer should be able to:

1. clone the repository
2. install dependencies
3. configure environment variables
4. start development servers

without complex manual setup.

---

# 18. Reproducibility

The repository must support reproducible environments.

Prefer:

- Docker for local infra
- lockfiles for dependencies
- explicit versioning

---

# 19. Stack Alignment

Repository structure must reflect chosen stack.

Examples:

Next.js → apps/web  
NestJS → apps/api  
Prisma → prisma/  

Avoid stack mismatches.

---

# 20. Production Awareness

Always consider production deployment implications.

This includes:

- environment separation
- build artifacts
- container builds
- runtime configuration

---

# 21. Security Baseline

Every production-ready repository must include a security skeleton.

Rules:
- Include a `.gitleaks.toml` or `.secrets.baseline` file to prevent secret accidental commits.
- CI pipeline must include a security scanning step (e.g., `npm audit`, `trivy`, or `snyk` placeholder).
- Include a `SECURITY.md` file defining how to report vulnerabilities.
- Ensure `.gitignore` is comprehensive for the chosen stack.

---

# 22. Handoff Automation

To ensure seamless integration with other agents, every project must generate a handoff file.

Rules:
- Generate a `repo-handoff.json` file in the root directory.
- The file must strictly follow the provided `repo-handoff.schema.json`.
- It must contain all metadata required for a `Backend Integrator Agent` or `Frontend Developer Agent` to understand the project structure and start implementing specific modules.

---

# 23. Dependency Graphing

Visual representation of the internal architecture is mandatory.

Rules:
- Include a Mermaid diagram in `ARCHITECTURE.md` showing the dependencies between `apps` and `packages`.
- Ensure the diagram is updated whenever the repository structure changes.

---

# 24. Deployment Awareness

Repository structure must reflect the chosen deployment target.

Rules:
- If `project.deploymentTarget` is known (from `repo-handoff.json`), consult the matching guide in `deployments/`.
- If the deployment target is unknown, consult `deployments/index.md` and document the selection rationale.
- Infrastructure files (Dockerfile, docker-compose, CI workflow) must align with the deployment platform.
- Never generate a Vercel-style config for an AWS ECS deployment, or vice versa.
- Always include deployment-specific environment variable documentation.

Deployment guide references:

| Target | Guide |
|---|---|
| AWS | `deployments/aws.md` |
| Railway | `deployments/railway.md` |
| Vercel | `deployments/vercel.md` |
| Fly.io | `deployments/fly-io.md` |

---

# 25. Observability Baseline

Every production-bound repository must include minimum observability infrastructure.

Rules:
- If `backend.services[]` contains any service of type `api`, the repository must include a health module with `/health/live` and `/health/ready` endpoints. These must be referenced in the `README.md` and the deployment configuration (health check path).
- Structured logging must be configured at the framework entry point. `console.log` must not be used in service or controller files. Use Pino (Node.js) or structlog (Python).
- A correlation ID middleware must be generated that propagates `X-Request-ID` through requests and attaches it to all log lines.
- If `backend.services[]` count is ≥ 2 (multi-service), OpenTelemetry instrumentation file (`src/instrument.ts` or equivalent) must be included.
- `LOG_LEVEL`, `SERVICE_NAME`, and `SENTRY_DSN` must be included in `.env.example`.
- If `infrastructure.cicd` is set, the CI workflow must include a step that verifies the health endpoint responds before completing a deployment (smoke test).

Apply `observability.md` for all implementation patterns.
