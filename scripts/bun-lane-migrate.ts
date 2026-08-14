/**
 * Custom migration applier for the parallel Bun test lane (TASK-557-03-L01).
 *
 * Replaces drizzle's migrator for the test lane only. Production
 * `core/server/startupMigrations.ts` and drizzle-kit are untouched.
 *
 * Behavior:
 *
 * - `readJournal` reads `core/db/migrations/meta/_journal.json` and returns
 *   its entries (idx 0..70 today) in order.
 * - `readMigrationSql` reads `core/db/migrations/<tag>.sql`.
 * - `splitStatements` splits a SQL file on the exact marker
 *   `--> statement-breakpoint` and drops empty chunks, so each chunk is one
 *   statement group.
 * - `appliedTags` ensures the schema-local track table
 *   `_bun_migrations(tag text primary key)` exists and returns the applied
 *   tags. Re-runs skip already-applied tags.
 * - `applyMigrationFile` runs one file's chunks inside ONE transaction with
 *   `SET LOCAL search_path TO <schema>, public`. Unqualified DDL lands in the
 *   worker schema (first search_path entry), while `public` stays resolvable
 *   for extension objects: `0006_search_indexes.sql` uses the `gin_trgm_ops`
 *   operator class created by `pg_trgm`, and operator classes are resolved
 *   through `search_path`. `public` is NOT implicitly searched, so a
 *   single-schema search_path would break 0006's GIN indexes.
 * - The migration files are shared verbatim with the production/public path
 *   (drizzle migrator + `startupMigrations.ts`), so they stay byte-identical.
 *   Drizzle emits `REFERENCES "public"."<table>"` for every FK (73 clauses
 *   across 34 files). `rewritePublicReferences` rewrites those clauses to the
 *   TARGET schema (`REFERENCES "<schema>"."<table>"`) at apply time, so
 *   worker-schema FKs resolve within the worker schema instead of dangling
 *   into `public` (PostgreSQL 23503 on every cross-table insert). All
 *   referenced tables are created by the migration set itself, so the
 *   rewritten target always exists in the migrated schema. The applied tag
 *   row commits atomically with that file's chunks.
 * - `migrateSchema` creates the schema if missing, applies every pending
 *   journal tag with per-file transactions (NEVER one whole-run transaction:
 *   71 files would hold long locks), and returns how many files were applied.
 *   A failing statement aborts only that file's transaction (partial file work
 *   rolls back, prior files stay applied) and surfaces as
 *   `migration_apply_failed:<tag>:<message>`; re-run resumes from the last
 *   successful tag. Statements are sent as literal SQL through `unsafe`, so
 *   the error message never echoes bind values.
 * - The CLI (`bun scripts/bun-lane-migrate.ts <schema>`) requires
 *   `DATABASE_DIRECT_URL` (direct 5432, not the pooler) and the schema
 *   argument, then logs a credential-free applied count.
 *
 * Importing this module opens no connection; the CLI and `migrateSchema` are
 * the only entry points that dial the database. Pure helpers (`readJournal`,
 * `splitStatements`) are importable by tests without runtime side effects.
 */
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const MIGRATIONS_DIR = "core/db/migrations";
const JOURNAL_PATH = `${MIGRATIONS_DIR}/meta/_journal.json`;
const BREAKPOINT = "--> statement-breakpoint";
const TRACK_TABLE = "_bun_migrations";

type Journal = { entries: Array<{ idx: number; tag: string }> };

export async function readJournal(): Promise<Journal> {
  return JSON.parse(await readFile(JOURNAL_PATH, "utf8")) as Journal;
}

export async function readMigrationSql(tag: string): Promise<string> {
  return readFile(`${MIGRATIONS_DIR}/${tag}.sql`, "utf8");
}

export function splitStatements(sqlText: string): string[] {
  return sqlText
    .split(BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

/**
 * Rewrite drizzle-generated `REFERENCES "public"."<table>"` clauses to the
 * target schema at apply time. The migration SQL files are shared verbatim
 * with the production/public path (drizzle migrator + startupMigrations), so
 * they must stay byte-identical; only the worker-schema applier rewrites the
 * public qualification so every FK resolves inside the worker schema.
 *
 * Every referenced table is created by the migration set itself (verified:
 * 73 clauses across 34 files, 31 distinct tables, none missing), so the
 * rewritten target always exists in the migrated schema. `public` stays
 * resolvable through `search_path` for extension objects (pg_trgm operator
 * classes); only explicit `REFERENCES "public"."X"` is rewritten.
 */
export function rewritePublicReferences(statement: string, schema: string): string {
  return statement.replace(
    /REFERENCES\s+"public"\."([^"]+)"/g,
    (_match, table: string) => `REFERENCES "${schema}"."${table}"`
  );
}

export async function appliedTags(client: postgres.Sql, schema: string): Promise<Set<string>> {
  await client.unsafe(
    `create table if not exists "${schema}"."${TRACK_TABLE}" ("tag" text primary key)`
  );
  const rows = await client.unsafe(`select tag from "${schema}"."${TRACK_TABLE}"`);
  return new Set(rows.map((r) => r.tag));
}

export async function applyMigrationFile(
  client: postgres.Sql,
  schema: string,
  tag: string,
  statements: string[]
): Promise<void> {
  await client.begin(async (tx) => {
    // Include `public` AFTER the worker schema: unqualified DDL lands in the
    // worker schema (first search_path entry), while `gin_trgm_ops` (pg_trgm
    // extension, installed in public) stays resolvable for 0006 GIN indexes.
    await tx.unsafe(`set local search_path to "${schema}", public`);
    for (const statement of statements) {
      await tx.unsafe(rewritePublicReferences(statement, schema));
    }
    await tx.unsafe(`insert into "${schema}"."${TRACK_TABLE}" ("tag") values ('${tag}')`);
  });
}

export async function migrateSchema(databaseUrl: string, schema: string): Promise<number> {
  const client = postgres(databaseUrl, { max: 2 });
  try {
    await client.unsafe(`create schema if not exists "${schema}"`);
    const done = await appliedTags(client, schema);
    const journal = await readJournal();
    let applied = 0;
    for (const entry of journal.entries) {
      if (done.has(entry.tag)) continue;
      const statements = splitStatements(await readMigrationSql(entry.tag));
      try {
        await applyMigrationFile(client, schema, entry.tag, statements);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`migration_apply_failed:${entry.tag}:${message}`);
      }
      applied += 1;
    }
    return applied;
  } finally {
    await client.end();
  }
}

// CLI: bun scripts/bun-lane-migrate.ts <schema>
if (import.meta.main) {
  const schema = process.argv[2];
  if (!schema) throw new Error("schema_argument_required");
  const url = process.env.DATABASE_DIRECT_URL;
  if (!url) throw new Error("DATABASE_DIRECT_URL_required");
  const count = await migrateSchema(url, schema);
  console.log(`[bun-lane-migrate] ${schema}: applied ${count} pending migrations`);
}
