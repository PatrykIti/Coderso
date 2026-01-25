# TASK-001: ORM Foundation and Auth Tables
# FileName: TASK-001_ORM_Foundation_and_Auth_Tables.md

**Priority:** High
**Category:** Core/DB
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** To Do

---

## Overview

Set up Drizzle ORM with PostgreSQL and implement base auth tables (users,
roles, user_roles, sessions). This task is the DB foundation for all CMS
features.

**Goals:**
- Working DB client and migration pipeline.
- Auth tables aligned with `DATA_MODEL.md`.
- Optional seed for initial admin user.

---

## Architecture

```
core/db/
  client.ts
  schema.ts
  drizzle.config.ts
  migrations/
  seed.ts

core/services/auth/
  userService.ts

tests/unit/db/
  schema.test.ts
  seed.test.ts
```

---

## Sub-Tasks

### TASK-001-01_Initialize_Drizzle_client_and_config

**Status:** To Do

Set up Drizzle with postgres.js and config for migrations.

Steps:
1) Add `DATABASE_URL` to `.env.example`.
2) Create `core/db/client.ts` with postgres.js + drizzle client.
3) Add `core/db/drizzle.config.ts` for drizzle-kit.
4) Verify connection with a simple query (manual smoke test).

Example `core/db/client.ts`:

```ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const sql = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(sql, { schema });
```

Example `core/db/drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./core/db/schema.ts",
  out: "./core/db/migrations",
  driver: "pg",
  dbCredentials: { connectionString: process.env.DATABASE_URL! },
} satisfies Config;
```

Commands (local):

```bash
bunx drizzle-kit generate --config core/db/drizzle.config.ts
bunx drizzle-kit migrate --config core/db/drizzle.config.ts
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/client.ts` | Drizzle client with postgres.js |
| `core/db/drizzle.config.ts` | Migration config |
| `.env.example` | `DATABASE_URL` placeholder |

---

### TASK-001-02_Define_auth_tables

**Status:** To Do

Define users, roles, user_roles, sessions in `core/db/schema.ts`.

Constraints and indexes:
- `users.email` unique.
- `roles.name` unique.
- `user_roles` composite PK (user_id, role_id).
- `sessions.token_hash` indexed (and unique if using random tokens).
- `sessions.expires_at` indexed for cleanup jobs.
- Foreign keys with cascade delete for `user_roles`.

Example snippet:

```ts
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id),
  roleId: uuid("role_id").notNull().references(() => roles.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
}));

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | Tables: users, roles, user_roles, sessions |
| `core/db/migrations/*` | Drizzle migration files |

---

### TASK-001-03_Seed_initial_admin_role_optional

**Status:** To Do

Add seed script for initial admin role + user (optional for local dev).

Inputs:
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` from env for local seed.
- Use argon2id to hash password (see `AUTH_SPEC.md`).

Example `core/db/seed.ts`:

```ts
import { db } from "./client";
import { users, roles, userRoles } from "./schema";

export async function seedAdmin() {
  const [role] = await db.insert(roles).values({
    name: "admin",
    permissions: ["*"],
  }).returning();

  const [user] = await db.insert(users).values({
    email: "admin@example.com",
    passwordHash: "<hashed>",
  }).returning();

  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/seed.ts` | Seed admin role/user |
| `core/services/auth/userService.ts` | Optional helper for seed |
| `.env.example` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` |

---

## Testing Requirements

- [ ] `tests/unit/db/schema.test.ts` validates tables and constraints.
- [ ] `tests/unit/db/seed.test.ts` verifies seed inserts role + user.
- [ ] `tests/integration/db/migrations.test.ts` verifies migrations apply.
- [ ] `tests/integration/db/sessionIndexes.test.ts` ensures token hash index exists.

---

## New Files to Create

- `core/db/client.ts`
- `core/db/drizzle.config.ts`
- `core/db/seed.ts`
- `core/db/migrations/*`
- `tests/unit/db/schema.test.ts`
- `tests/unit/db/seed.test.ts`
- `tests/integration/db/migrations.test.ts`
- `tests/integration/db/sessionIndexes.test.ts`

---

## Documentation Updates Required

- `_docs/ORM_SPEC.md` (if config changes).
- `_docs/DATA_MODEL.md` (auth tables if updated).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-orm-auth-tables.md`
- Notes: drizzle client, auth tables, seed script.

---

## Additional Docs

- `_docs/AUTH_SPEC.md`
- `_docs/RBAC_SPEC.md`
