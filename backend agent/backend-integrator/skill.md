---
name: backend-integrator
description: Converts completed frontend flows into backend APIs, database schemas, integrations, and implementation-ready backend architecture.
allowed-tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---

# Backend Integrator Skill

## Purpose

The Backend Integrator Skill analyzes completed frontend flows and automatically derives the backend architecture required to support them.

It transforms UI and product flows into:

- backend entities
- API endpoints
- database schemas
- validation rules
- authentication and authorization
- storage integrations
- external service integrations
- background jobs
- webhook handlers
- environment variables
- backend module/file structures

The goal is to ensure that once frontend is implemented, the backend can be generated or scaffolded consistently.

---

# When To Use This Skill

Use this skill when:

- frontend screens are already implemented
- forms require backend APIs
- dashboards require data aggregation endpoints
- uploads require storage integration
- payments require provider integration
- notifications or emails must be triggered
- asynchronous jobs are required
- external APIs must be connected
- a backend architecture must be generated from UI flows

---

# Typical Inputs

This skill can receive:

- frontend page descriptions
- component trees
- form field lists
- action definitions
- table/list structures
- auth flows
- upload fields
- admin workflows
- existing repo structure
- existing backend stack

Example input:


Frontend pages:

Login page

Dashboard

Product list

Create product form

Order page

Forms:

login form

create product form

edit product form

Uploads:

product image upload


---

# Expected Output

The skill should generate structured backend outputs including:

1. Frontend inference summary
2. Entities and relationships
3. API endpoint list
4. Request/response schemas
5. Validation rules
6. Auth and permission model
7. Third-party integrations
8. Background jobs
9. Webhooks
10. Environment variables
11. File/module structure
12. Implementation order
13. Edge cases and risks

---

# Execution Flow

When this skill is invoked, follow this process:

### Step 1 — Analyze Frontend

Identify:

- entities implied by UI
- user actions
- CRUD operations
- data relationships
- upload needs
- admin privileges
- external triggers

---

### Step 2 — Define Data Model

Infer:

- entities
- relationships
- ownership boundaries
- indexes
- multi-tenant requirements
- audit requirements

---

### Step 3 — Design API

Define:

- routes
- HTTP methods
- request body
- query params
- response shapes
- validation

---

### Step 4 — Detect Integrations

Identify integrations such as:

- payment providers
- email providers
- SMS providers
- storage providers
- analytics services
- AI APIs
- mapping services

Design adapter/service boundaries.

---

### Step 5 — Async Work

Detect background jobs:

- emails
- notifications
- webhook processing
- analytics generation
- file processing
- imports/exports

Define:

- queue
- worker
- retry policy

---

### Step 6 — Environment Variables

List all environment variables required for:

- database
- integrations
- queues
- storage
- auth secrets

---

### Step 7 — File Structure

Generate backend module/file plan.

Example:


src/
modules/
users/
user.controller.ts
user.service.ts
user.repository.ts
user.dto.ts
products/
product.controller.ts
product.service.ts
product.repository.ts
integrations/
stripe.adapter.ts
email.adapter.ts
jobs/
email.job.ts
webhook.job.ts
config/
env.ts


---

# Operation Modes

The skill supports three levels of output.

## Mode A — Blueprint

Generate architecture only:

- entities
- API list
- integrations
- env variables
- file plan

---

## Mode B — Scaffold

Generate skeleton implementation:

- DTOs
- controllers
- services
- repositories
- migrations
- env example
- README

---

## Mode C — Full Implementation

Generate or implement:

- endpoint logic
- business logic
- integrations
- webhook handlers
- background jobs
- tests

---

# Backend Stack Awareness

If the user specifies a stack, the skill should adapt output.

Possible stacks:

Backend frameworks:

- NestJS
- Express
- FastAPI
- Next.js API routes
- Supabase edge functions

Database:

- PostgreSQL
- MySQL
- MongoDB
- Supabase

ORM:

- Prisma
- Drizzle
- TypeORM

Queue systems:

- BullMQ
- Redis
- Celery

Storage:

- S3
- Cloudinary
- Supabase Storage

---

# Non-Negotiable Constraints

The skill must always:

- define API contracts first
- define validation for all inputs
- isolate external integrations
- define environment variables
- consider authentication
- consider authorization
- consider async jobs
- define error cases
- avoid vague architecture

---

# Example Invocation

Example prompt:


Use the backend-integrator skill.

Frontend has:

login page

dashboard

product CRUD

product image upload

order dashboard

Stack:

Backend: NestJS
DB: PostgreSQL
ORM: Prisma
Queue: BullMQ

Generate backend architecture and scaffolding.


---

# Goal

This skill ensures that backend systems can be derived reliably from frontend
