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

export async function seedWorkerSchema(
  databaseUrl: string,
  workerIndex: number,
  opts: { adminEmail?: string; adminPassword?: string } = {}
): Promise<void> {
  const schema = workerSchemaName(workerIndex);
  const client = postgres(databaseUrl, { max: 2 });
  try {
    await client.begin(async (tx) => {
      await tx.unsafe(`set local search_path to "${schema}"`);
      // Admin user only if absent (empty schema -> insert; idempotent guard).
      const admin = await tx.unsafe(
        `select id from "users" where role = 'admin' limit 1`
      );
      if (admin.length === 0) {
        // Match the production admin creation contract (hash via the same
        // auth helper the installer uses; never store plaintext).
        await tx.unsafe(
          `insert into "users" (id, email, password_hash, role, ...) values (gen_random_uuid(), ${opts.adminEmail ?? ""}, ${hashPlaceholder}, 'admin', ...)`
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
(conflict guards); never touches `public`.

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
