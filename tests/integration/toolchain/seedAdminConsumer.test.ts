/**
 * DB-backed proof for TASK-518-02: `createFirstAdmin` and `seedAdmin()` resolve
 * the admin role by the migration-guaranteed stable `DEFAULT_ADMIN_ROLE_ID`
 * (0071 seed migration), falling back to select-by-name "admin" for pre-518
 * installs whose role carries a legacy random id. Neither consumer ever
 * creates a duplicate role or renumbers an existing one, and idempotent
 * re-runs are no-ops (`seedAdmin`) / fail closed
 * (`createFirstAdmin` -> `first_run_unavailable`).
 *
 * Same gating/pattern as `seedAdminRoleMigration.test.ts` (TASK-518-01): runs
 * only when `DATABASE_DIRECT_URL` is set and skips cleanly otherwise; each
 * scenario owns a throwaway worker schema dropped before and after; the suite
 * never touches `public` or any other schema. Consumers run against a drizzle
 * client whose connection carries `options=-csearch_path=<schema>` so every
 * unqualified table lands in the worker schema.
 *
 * The legacy scenario applies every migration except `0071`, inserts a legacy
 * random-id `admin` role (exactly what the pre-518 consumers used to create
 * ad-hoc), then applies the real `0071` artifact (a no-op under its
 * `WHERE NOT EXISTS` guard) so the DB is fully migrated with a legacy-id role.
 */
import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../../core/db/schema";
import { users } from "../../../core/db/schema";
import { DEFAULT_ADMIN_ROLE_ID } from "../../../core/db/seedConstants";
import { seedAdmin } from "../../../core/db/seed";
import { createFirstAdmin } from "../../../core/services/admin/firstRunService";
import { hashEmail, normalizeEmail } from "../../../core/services/security/piiEmail";
import {
  appliedTags,
  applyMigrationFile,
  migrateSchema,
  readJournal,
  readMigrationSql,
  splitStatements,
} from "../../../scripts/bun-lane-migrate";

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;
const FRESH_CREATE_SCHEMA = "seed_admin_consumer_fresh_create";
const FRESH_SEED_SCHEMA = "seed_admin_consumer_fresh_seed";
const LEGACY_SCHEMA = "seed_admin_consumer_legacy";
const MIGRATION_TAG = "0071_seed_admin_role";
const TOTAL_MIGRATIONS = 79;
const LEGACY_ROLE_ID = randomUUID();

let sql: postgres.Sql | undefined;
let freshCreateDb: WorkerDb | undefined;
let freshSeedDb: WorkerDb | undefined;
let legacyDb: WorkerDb | undefined;
const clients: postgres.Sql[] = [];

type WorkerDb = ReturnType<typeof makeWorkerDb>;

function qualified(table: string, schemaName: string): string {
  return `"${schemaName}"."${table}"`;
}

function makeWorkerDb(schemaName: string) {
  const client = postgres(DATABASE_DIRECT_URL!, {
    max: 2,
    connection: { options: `-csearch_path=${schemaName}` },
  });
  clients.push(client);
  return drizzle(client, { schema });
}

async function adminRoles(schemaName: string): Promise<Array<Record<string, unknown>>> {
  return sql!.unsafe(
    `select id, name, permissions from ${qualified("roles", schemaName)} where name = 'admin'`
  );
}

async function roleCount(schemaName: string): Promise<number> {
  const rows = await sql!.unsafe(
    `select count(*)::int as n from ${qualified("roles", schemaName)}`
  );
  return rows[0].n as number;
}

async function stableRoleCount(schemaName: string): Promise<number> {
  const rows = await sql!.unsafe(
    `select count(*)::int as n from ${qualified("roles", schemaName)} where id = '${DEFAULT_ADMIN_ROLE_ID}'`
  );
  return rows[0].n as number;
}

async function userCount(schemaName: string): Promise<number> {
  const rows = await sql!.unsafe(
    `select count(*)::int as n from ${qualified("users", schemaName)}`
  );
  return rows[0].n as number;
}

async function userRolesFor(
  schemaName: string,
  userId: string
): Promise<Array<Record<string, unknown>>> {
  return sql!.unsafe(
    `select user_id, role_id from ${qualified("user_roles", schemaName)} where user_id = '${userId}'`
  );
}

async function userRolesCount(schemaName: string): Promise<number> {
  const rows = await sql!.unsafe(
    `select count(*)::int as n from ${qualified("user_roles", schemaName)}`
  );
  return rows[0].n as number;
}

/**
 * User lookup seam over a worker schema, mirroring
 * `userService.getUserByEmail`'s primary path (email_hash first, raw email
 * fallback for legacy rows) so the whole `seedAdmin` runs against one schema
 * instead of the shared `public` tables. `users.email` stores an HMAC digest
 * (PII design), so raw-email lookups must go through `email_hash`.
 */
async function lookupUserOn(workerDb: WorkerDb, email: string) {
  const normalized = normalizeEmail(email);
  const emailHash = hashEmail(normalized);
  const [row] = await workerDb
    .select()
    .from(users)
    .where(or(eq(users.emailHash, emailHash), eq(users.email, normalized)));
  return row ?? null;
}

/**
 * Apply every journal migration except `skippedTag` into a fresh schema, so a
 * scenario can seed a legacy row before that single migration runs.
 */
async function migrateExceptTag(schemaName: string, skippedTag: string): Promise<number> {
  const client = postgres(DATABASE_DIRECT_URL!, { max: 2 });
  try {
    await client.unsafe(`create schema if not exists "${schemaName}"`);
    const done = await appliedTags(client, schemaName);
    const journal = await readJournal();
    let applied = 0;
    for (const entry of journal.entries) {
      if (entry.tag === skippedTag || done.has(entry.tag)) continue;
      const statements = splitStatements(await readMigrationSql(entry.tag));
      await applyMigrationFile(client, schemaName, entry.tag, statements);
      applied += 1;
    }
    return applied;
  } finally {
    await client.end();
  }
}

function withAdminEnv(email: string, password: string): () => void {
  const prevEmail = process.env.ADMIN_EMAIL;
  const prevPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_EMAIL = email;
  process.env.ADMIN_PASSWORD = password;
  return () => {
    if (prevEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = prevEmail;
    if (prevPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevPassword;
  };
}

beforeAll(async () => {
  if (!DATABASE_DIRECT_URL) return;
  sql = postgres(DATABASE_DIRECT_URL, { max: 2 });
  await sql.unsafe(`drop schema if exists "${FRESH_CREATE_SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${FRESH_SEED_SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${LEGACY_SCHEMA}" cascade`);

  // Fresh installs: full migrate (0071 seeds the stable-id admin role).
  const freshCreate = await migrateSchema(DATABASE_DIRECT_URL, FRESH_CREATE_SCHEMA);
  expect(freshCreate).toBe(TOTAL_MIGRATIONS);
  const freshSeed = await migrateSchema(DATABASE_DIRECT_URL, FRESH_SEED_SCHEMA);
  expect(freshSeed).toBe(TOTAL_MIGRATIONS);

  // Legacy install: every migration except 0071, a random-id 'admin' role as
  // the pre-518 consumers created it, then the real 0071 artifact (no-op under
  // the WHERE NOT EXISTS guard).
  const applied = await migrateExceptTag(LEGACY_SCHEMA, MIGRATION_TAG);
  expect(applied).toBe(TOTAL_MIGRATIONS - 1);
  await sql.unsafe(
    `insert into ${qualified("roles", LEGACY_SCHEMA)} (id, name, permissions, created_at)
     values ('${LEGACY_ROLE_ID}', 'admin', '["*"]', now())`
  );
  const statements = splitStatements(await readMigrationSql(MIGRATION_TAG));
  await applyMigrationFile(sql, LEGACY_SCHEMA, MIGRATION_TAG, statements);

  freshCreateDb = makeWorkerDb(FRESH_CREATE_SCHEMA);
  freshSeedDb = makeWorkerDb(FRESH_SEED_SCHEMA);
  legacyDb = makeWorkerDb(LEGACY_SCHEMA);
}, 900000);

afterAll(async () => {
  for (const client of clients) await client.end();
  if (!sql) return;
  await sql.unsafe(`drop schema if exists "${FRESH_CREATE_SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${FRESH_SEED_SCHEMA}" cascade`);
  await sql.unsafe(`drop schema if exists "${LEGACY_SCHEMA}" cascade`);
  await sql.end();
}, 900000);

const FIRST_ADMIN_INPUT = {
  name: "Ada Admin",
  email: "ada@example.com",
  password: "correct horse",
};
const SEED_EMAIL = "seed-admin@example.com";
const SEED_PASSWORD = "correct horse battery staple";

test.skipIf(!DATABASE_DIRECT_URL)(
  "fresh empty DB: createFirstAdmin assigns the stable-id role (no duplicate, no random id)",
  async () => {
    const db = freshCreateDb!;
    const result = await createFirstAdmin(FIRST_ADMIN_INPUT, {
      db,
      isFirstRun: async () => true,
    });

    expect(result.roleId).toBe(DEFAULT_ADMIN_ROLE_ID);
    const roles = await adminRoles(FRESH_CREATE_SCHEMA);
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe(DEFAULT_ADMIN_ROLE_ID);
    expect(roles[0].name).toBe("admin");
    expect(roles[0].permissions).toEqual(["*"]);
    expect(await roleCount(FRESH_CREATE_SCHEMA)).toBe(1); // no duplicate role
    expect(await userCount(FRESH_CREATE_SCHEMA)).toBe(1);
    const assignments = await userRolesFor(FRESH_CREATE_SCHEMA, result.id);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].role_id).toBe(DEFAULT_ADMIN_ROLE_ID);
  },
  900000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "createFirstAdmin idempotent re-run fails closed: no second user, no duplicate role",
  async () => {
    await expect(
      createFirstAdmin(FIRST_ADMIN_INPUT, {
        db: freshCreateDb!,
        isFirstRun: async () => true,
      })
    ).rejects.toThrow("first_run_unavailable");
    expect(await userCount(FRESH_CREATE_SCHEMA)).toBe(1);
    expect(await roleCount(FRESH_CREATE_SCHEMA)).toBe(1);
    expect(await userRolesCount(FRESH_CREATE_SCHEMA)).toBe(1);
  },
  900000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "fresh empty DB: seedAdmin assigns the stable-id role (no duplicate, no random id)",
  async () => {
    const restore = withAdminEnv(SEED_EMAIL, SEED_PASSWORD);
    try {
      await seedAdmin({
        db: freshSeedDb!,
        getUserByEmail: (email) => lookupUserOn(freshSeedDb!, email),
      });
    } finally {
      restore();
    }

    const roles = await adminRoles(FRESH_SEED_SCHEMA);
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe(DEFAULT_ADMIN_ROLE_ID);
    expect(await roleCount(FRESH_SEED_SCHEMA)).toBe(1);
    expect(await userCount(FRESH_SEED_SCHEMA)).toBe(1);
    const [user] = await sql!.unsafe(
      `select id from ${qualified("users", FRESH_SEED_SCHEMA)} where email_hash = '${hashEmail(SEED_EMAIL)}'`
    );
    expect(user).toBeDefined();
    const assignments = await userRolesFor(FRESH_SEED_SCHEMA, user.id);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].role_id).toBe(DEFAULT_ADMIN_ROLE_ID);
  },
  900000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "seedAdmin idempotent re-run is a no-op: no new user, role, or assignment",
  async () => {
    const restore = withAdminEnv(SEED_EMAIL, SEED_PASSWORD);
    try {
      await seedAdmin({
        db: freshSeedDb!,
        getUserByEmail: (email) => lookupUserOn(freshSeedDb!, email),
      });
    } finally {
      restore();
    }

    expect(await userCount(FRESH_SEED_SCHEMA)).toBe(1);
    expect(await roleCount(FRESH_SEED_SCHEMA)).toBe(1);
    expect(await userRolesCount(FRESH_SEED_SCHEMA)).toBe(1);
  },
  900000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "legacy random-id admin role: createFirstAdmin resolves it (no duplicate, no renumber)",
  async () => {
    const result = await createFirstAdmin(
      { ...FIRST_ADMIN_INPUT, email: "legacy-create@example.com" },
      { db: legacyDb!, isFirstRun: async () => true }
    );

    expect(result.roleId).toBe(LEGACY_ROLE_ID);
    const roles = await adminRoles(LEGACY_SCHEMA);
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe(LEGACY_ROLE_ID);
    expect(await roleCount(LEGACY_SCHEMA)).toBe(1);
    expect(await stableRoleCount(LEGACY_SCHEMA)).toBe(0);
    const assignments = await userRolesFor(LEGACY_SCHEMA, result.id);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].role_id).toBe(LEGACY_ROLE_ID);
  },
  900000
);

test.skipIf(!DATABASE_DIRECT_URL)(
  "legacy random-id admin role: seedAdmin resolves it (no duplicate, no renumber)",
  async () => {
    const restore = withAdminEnv("legacy-seed@example.com", SEED_PASSWORD);
    try {
      await seedAdmin({
        db: legacyDb!,
        getUserByEmail: (email) => lookupUserOn(legacyDb!, email),
      });
    } finally {
      restore();
    }

    const roles = await adminRoles(LEGACY_SCHEMA);
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe(LEGACY_ROLE_ID);
    expect(await roleCount(LEGACY_SCHEMA)).toBe(1);
    expect(await stableRoleCount(LEGACY_SCHEMA)).toBe(0);
    const [user] = await sql!.unsafe(
      `select id from ${qualified("users", LEGACY_SCHEMA)} where email_hash = '${hashEmail("legacy-seed@example.com")}'`
    );
    expect(user).toBeDefined();
    const assignments = await userRolesFor(LEGACY_SCHEMA, user.id);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].role_id).toBe(LEGACY_ROLE_ID);
  },
  900000
);
