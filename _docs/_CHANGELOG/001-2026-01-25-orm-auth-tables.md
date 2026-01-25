# ORM Foundation and Auth Tables

**Task ID:** TASK-001
**Date:** 2026-01-25
**Author:** Gemini Agent

## Changes

- Initialized monorepo structure with Bun workspaces (`core`, `store`, `packages`).
- Configured Drizzle ORM with PostgreSQL in `core`.
- Defined base authentication schema:
  - `users`: Standard user table.
  - `roles`: RBAC roles.
  - `user_roles`: Many-to-many relationship.
  - `sessions`: Session management with token hashing.
- Created database migration pipeline using `drizzle-kit`.
- Added seed script (`core/db/seed.ts`) for initial admin setup.

## Technical Details

- **Stack:** Bun, PostgreSQL, Drizzle ORM.
- **Migrations:** Located in `core/db/migrations`.
- **Config:** `core/db/client.ts` establishes the connection pool.
