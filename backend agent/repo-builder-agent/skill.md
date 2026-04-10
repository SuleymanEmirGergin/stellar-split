---
name: repo-builder
description: Generates production-ready repository structures from frontend and backend architecture outputs.
allowed-tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---

# Repo Builder Skill

## Purpose

The Repo Builder skill converts system architecture outputs into a complete repository structure.

It analyzes:

- frontend architecture
- backend architecture
- infrastructure requirements
- stack preferences

and produces a **clean, scalable project repository layout**.

This includes:

- repository structure
- application separation
- shared packages
- environment configuration
- infrastructure setup
- containerization
- CI/CD skeleton
- documentation
- developer setup instructions

---

# When To Use This Skill

Use this skill when:

- frontend architecture already exists
- backend architecture already exists
- integrations have been defined
- the project requires a repository structure
- a new project repository must be generated
- an existing repository must be reorganized

Typical scenarios:

- creating a new SaaS project
- scaffolding a fullstack monorepo
- generating a microservice repository
- preparing infrastructure for local development

---

# Typical Inputs

The skill may receive:

- frontend agent outputs
- backend agent outputs
- architecture documents
- handoff JSON files
- selected stack information

Example input:

Frontend:
- Next.js dashboard
- authentication pages
- admin panel

Backend:
- NestJS API
- PostgreSQL
- Prisma ORM
- Redis queue
- background worker

Integrations:
- Stripe
- S3 storage
- SendGrid email
