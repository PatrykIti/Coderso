# TASK-557-07-L02: Seed-Assumption Inventory and Per-Worker Seed
# FileName: TASK-557-07-L02-Seed-Assumption-Inventory-And-Per-Worker-Seed.md
**Parent Subtask:** TASK-557-07
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Medium
**Dependencies:** TASK-557-07-L01 (schema-aware helpers)
**Status:** ⏳ To Do
---
## Overview
Fresh worker schemas are empty (no admin user, no starter content, no settings
rows). Today's lane runs on a long-lived `public` schema that accumulates
state (12+ dirty settings rows observed: `auth.sessionTtlDays=365`,
`setup.completed=true`, `site.locale=pl`, orphaned `site.contentRoutes`),
which masks seed assumptions. This leaf inventories every in-lane file that
reads pre-existing rows and, where needed, adds a per-worker seed module that
runs once per schema after migration (admin user + required defaults), scoped
strictly to the worker schema.

## Implementation Pseudocode
```ts
// scripts/bun-lane-seed.ts (per-worker seed, invoked by provisioning)
import postgres from "postgres";
import { workerSchemaName } from "./bun-lane-worker-url";

// Admin creation MUST mirror the production contract (firstRunService
// createFirstAdmin pattern): users has NO `role` column — the admin role is
// linked through roles + user_roles. Password is hashed with the same
// argon2id helper (`hashPassword` from core/services/auth/password.ts), never
// a placeholder. Email PII fields use `buildEmailFields` from
// core/security/piiEmail.ts (emailHash/emailEncrypted).
export async function seedWorkerSchema(
  databaseUrl: string,
  workerIndex: number,
  opts: { adminEmail?: string; adminPassword?: string } = {}
): Promise<void> {
  const schema = workerSchemaName(workerIndex);
  const client = postgres(databaseUrl, { max: 2 });
  try {
    const passwordHash = await hashPassword(opts.adminPassword ?? "admin-seed-password");
    const emailFields = await buildEmailFields(opts.adminEmail ?? "admin@coderso.test");
    await client.begin(async (tx) => {
      await tx.unsafe(`set local search_path to "${schema}"`);
      // Admin only if absent (empty schema -> insert; idempotent guard).
      const admin = await tx.unsafe(
        `select u.id from "users" u
         join "user_roles" ur on ur.user_id = u.id
         join "roles" r on r.id = ur.role_id
         where r.name = 'admin'
         limit 1`
      );
      if (admin.length === 0) {
        // Delegate to the real installer helpers when importable, otherwise
        // mirror them exactly (verified against firstRunService.ts:113-138):
        // users has NO role column; admin role is inserted into roles with
        // permissions ['*'] and linked via user_roles.
        const roleId = await tx.unsafe(
          `select id from "roles" where name = 'admin' limit 1`
        );
        let role = roleId[0] as { id: string } | undefined;
        if (!role) {
          const created = await tx.unsafe(
            `insert into "roles" (name, permissions) values ('admin', '["*"]') returning id`
          );
          role = created[0] as { id: string };
        }
        const adminId = await tx.unsafe(
          `insert into "users" (email, email_hash, email_encrypted, name, password_hash, status, created_at, updated_at)
           values (${opts.adminEmail ?? "admin@coderso.test"}, ${emailFields.emailHash}, ${emailFields.emailEncrypted}, 'Admin', ${passwordHash}, 'active', now(), now())
           returning id`
        );
        await tx.unsafe(
          `insert into "user_roles" (user_id, role_id) values (${adminId[0].id}, ${role.id}) on conflict do nothing`
        );
      }
      // Defaults that empty-schema tests rely on (list from the inventory).
      await tx.unsafe(
        `insert into "settings" ("key", "value") values
          ('setup.completed', 'true'),
          ('site.name', 'Coderso Test'),
          ('site.locale', 'en-US')
        on conflict ("key") do nothing`
      );
    });
  } finally {
    await client.end();
  }
}
```

Seed shape note: the EXACT column names are verified against the live Drizzle
schema and `createFirstAdmin` (`core/services/admin/firstRunService.ts:113-138`):
`users` has `email`, `emailHash`, `emailEncrypted`, `name`, `passwordHash`,
`status` ('active'), `createdAt`, `updatedAt` — NO `role` column. Roles are
seeded as `roles(name='admin', permissions=['*'])` linked through
`user_roles(userId, roleId)`. The audit flagged the original contract's `role`
column as non-existent; re-verify against `core/db/schema.ts` and the real
helper before implementation rather than trusting this pseudocode verbatim.

The exact seed shape MUST come from the inventory step (do not invent keys):
run the lane once on a fresh worker schema, collect every failure, and for each
file read whether it assumed a seeded admin (`users limit 1`, firstAdminRace,
installAdmin), starter content routes, or a settings default. Keep the seed
MINIMAL — prefer fixing the test to create its own fixture over seeding global
state. Files that snapshot/restore settings (`setTestSetting` +
`restoreSettings` pattern) already own their rows and need no seed.

Inventory output (`tests/bun-lane-seed-inventory.md`, committed): per-file
table {file, assumed_state, fix_kind: test_fixture | worker_seed, notes}.

Error handling: seed is transactional per schema; a seed failure aborts that
worker's provisioning (`worker_seed_failed:<schema>`); idempotent on re-run
(conflict guards); never touches `public`. Password hashing is the real
argon2id helper — never a placeholder; email PII uses `buildEmailFields` so
no plaintext PII is seeded.

Regression-test shape (DB-gated, `tests/integration/toolchain/workerSeed.test.ts`):
- After `seedWorkerSchema(url, 0)`, `users` has exactly one admin and
  `settings` has the three defaults; re-run adds nothing.
- A file that previously failed on empty schema passes after seed (spot-check
  the 3-5 files from the inventory that use worker_seed).
- `public` row counts are unchanged before/after (no leakage).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Inventory committed; DB-gated seed tests green with `DATABASE_DIRECT_URL`;
  clean skip otherwise; cleanup only own schemas.
- Record the list of files fixed via test_fixture vs worker_seed in the handoff.

## Documentation Updates Required
- `tests/README.md` + `_docs/TESTING_STRATEGY.md` — empty-schema invariant and
  per-worker seed contract.
