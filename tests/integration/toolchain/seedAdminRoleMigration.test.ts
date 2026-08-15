/**
 * DB-backed proof for the TASK-518 seed migration (`0071_seed_admin_role`):
 * a fresh `db:migrate` (no seed) yields exactly one `admin` role with the
 * stable `DEFAULT_ADMIN_ROLE_ID`; re-running the migration is a no-op; a
 * pre-existing legacy-id `admin` role is never duplicated or renumbered.
 *
 * Same gating/pattern as `tests/integration/toolchain/bunLaneMigrate.test.ts`:
 * runs only when `DATABASE_DIRECT_URL` is set and skips cleanly otherwise; each
 * scenario owns a throwaway worker schema dropped before and after, and the
 * suite never touches `public` or any other schema.
 *
 * The legacy scenario cannot insert into `roles` before any migration runs (the
 * table does not exist yet), so it applies every migration except `0071`,
 * inserts a legacy random-id `admin` role, then applies the real `0071`
 * artifact: the `WHERE NOT EXISTS` guard must leave the legacy role untouched.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

import {
  appliedTags,
  applyMigrationFile,
  migrateSchema,
  readJournal,
  readMigrationSql,
  splitStatements,
} from "../../../scripts/bun-lane-migrate";
import { DEFAULT_ADMIN_ROLE_ID } from "../../../core/db/seedConstants";

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;
const SCHEMA = "seed_admin_role_test";
const LEGACY_SCHEMA = "seed_admin_role_test_legacy";
const MIGRATION_TAG = "0071_seed_admin_role";
const TOTAL_MIGRATIONS = 73;

let sql: postgres.Sql | undefined;

function qualified(table: string, schema = SCHEMA): string {
  return `"${schema}"."${table}"`;
}

async function adminRoles(schema = SCHEMA): Promise<Array<Record<string, unknown>>> {
  return sql!.unsafe(
    `select id, name, permissions from ${qualified("roles", schema)} where name = 'admin'`
  );
}

async function roleCount(schema = SCHEMA): Promise<number> {
  const rows = await sql!.unsafe(`select count(*)::int as n from ${qualified("roles", schema)}`);
  return rows[0].n as number;
}

async function stableRoleCount(schema = SCHEMA): Promise<number> {
  const rows = await sql!.unsafe(
    `select count(*)::int as n from ${qualified("roles", schema)} where id = '${DEFAULT_ADMIN_ROLE_ID}'`
  );
  return rows[0].n as number;
}

/**
 * Apply every journal migration except `skippedTag` into a fresh schema, so a
 * scenario can seed a legacy row before that single migration runs.
 */
async function migrateExceptTag(schema: string, skippedTag: string): Promise<number> {
  const client = postgres(DATABASE_DIRECT_URL!, { max: 2 });
  try {
    await client.unsafe(`create schema if not exists "${schema}"`);
    const done = await appliedTags(client, schema);
    const journal = await readJournal();
    let applied = 0;
    for (const entry of journal.entries) {
      if (entry.tag === skippedTag || done.has(entry.tag)) continue;
      const statements = splitStatements(await readMigrationSql(entry.tag));
      await applyMigrationFile(client, schema, entry.tag, statements);
      applied += 1;
    }
    return applied;
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  if (!DATABASE_DIRECT_URL) return;
  sql = postgres(DATABASE_DIRECT_URL, { max: 2 });
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${LEGACY_SCHEMA}" cascade`);
});

afterAll(async () => {
  if (!sql) return;
  await sql.unsafe(`drop schema if exists "${SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${LEGACY_SCHEMA}" cascade`);
  await sql.end();
});

test.skipIf(!DATABASE_DIRECT_URL)(
  "fresh-schema migrate yields exactly one admin role with the stable id; re-run is a no-op",
  async () => {
    const first = await migrateSchema(DATABASE_DIRECT_URL!, SCHEMA);
    expect(first).toBe(TOTAL_MIGRATIONS);

    const roles = await adminRoles();
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe(DEFAULT_ADMIN_ROLE_ID);
    expect(roles[0].name).toBe("admin");
    expect(roles[0].permissions).toEqual(["*"]);
    // No other roles exist: the migration is the only roles source.
    expect(await roleCount()).toBe(1);

    // Idempotent re-run: 0 migrations applied, state unchanged.
    const second = await migrateSchema(DATABASE_DIRECT_URL!, SCHEMA);
    expect(second).toBe(0);
    const again = await adminRoles();
    expect(again).toHaveLength(1);
    expect(again[0].id).toBe(DEFAULT_ADMIN_ROLE_ID);
    expect(await roleCount()).toBe(1);
  },
  900000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "pre-existing legacy-id admin role is left untouched (no duplicate, no renumber)",
  async () => {
    // Build the pre-518 state: every migration EXCEPT 0071, then a legacy
    // random-id 'admin' role as createFirstAdmin/seedAdmin used to create it.
    const applied = await migrateExceptTag(LEGACY_SCHEMA, MIGRATION_TAG);
    expect(applied).toBe(TOTAL_MIGRATIONS - 1);

    const legacyId = randomUUID();
    await sql!.unsafe(
      `insert into ${qualified("roles", LEGACY_SCHEMA)} (id, name, permissions, created_at)
       values ('${legacyId}', 'admin', '["*"]', now())`
    );

    // Now the real 0071 artifact runs: the WHERE NOT EXISTS guard must keep the
    // legacy role untouched (no duplicate, no renumber, no stable-id insert).
    const statements = splitStatements(await readMigrationSql(MIGRATION_TAG));
    await applyMigrationFile(sql!, LEGACY_SCHEMA, MIGRATION_TAG, statements);

    const roles = await adminRoles(LEGACY_SCHEMA);
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe(legacyId);
    expect(roles[0].name).toBe("admin");
    expect(roles[0].permissions).toEqual(["*"]);
    expect(await roleCount(LEGACY_SCHEMA)).toBe(1);
    expect(await stableRoleCount(LEGACY_SCHEMA)).toBe(0);
  },
  900000
);
