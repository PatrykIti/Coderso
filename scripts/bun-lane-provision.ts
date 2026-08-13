/**
 * Worker schema provisioning for the parallel Bun test lane (TASK-557-03-L02).
 *
 * Called once by the runner (TASK-557-05) before spawning workers so every
 * worker starts with an empty, fully migrated schema:
 *
 * - `provisionWorkers` derives the exact `bun_worker_<i>` schema names for
 *   `0..workerCount-1` via `workerSchemaName`, drops ONLY those schemas
 *   (never a wildcard, never user input; `public` and any control schemas
 *   such as `bun_control_schema` are untouched), then applies the full
 *   migration set to each schema concurrently with bounded concurrency via
 *   `migrateSchema` (TASK-557-03-L01). It is idempotent and re-runnable.
 * - A drop failure aborts with `provision_drop_failed:<schema>` before any
 *   migration starts. A `migrateSchema` failure propagates as
 *   `migration_apply_failed:<tag>` and aborts provisioning, so no partial
 *   worker set ever starts.
 * - Connection strings are never logged: results carry `{schema, applied}`
 *   only, and error text is scrubbed of the URL/userinfo before it leaves.
 *
 * Importing this module opens no connection; the CLI and `provisionWorkers`
 * are the only entry points that dial the database.
 */
import postgres from "postgres";

import { migrateSchema } from "./bun-lane-migrate";
import { workerSchemaName } from "./bun-lane-worker-url";

/** Max worker count the CLI accepts (1..16), mirroring `resolveWorkerCount`. */
const MAX_CLI_WORKERS = 16;

/**
 * Scrub the direct URL (and its userinfo) from error text before it surfaces,
 * so no connection string reaches a log or caller.
 */
function redactUrl(text: string, databaseUrl: string): string {
  let redacted = text.replaceAll(databaseUrl, "<redacted>");
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.username) {
      redacted = redacted.replaceAll(`${parsed.username}:${parsed.password}@`, "<redacted>@");
      redacted = redacted.replaceAll(parsed.username, "<redacted>");
    }
  } catch {
    // Not a parseable URL; the exact-string replacement above still applies.
  }
  return redacted;
}

/**
 * Drop the exact derived worker schemas (`bun_worker_0..K-1`), then migrate
 * each concurrently with bounded concurrency. Returns the per-schema applied
 * counts sorted by schema name.
 */
export async function provisionWorkers(
  databaseUrl: string,
  workerCount: number,
  concurrency = Math.min(workerCount, 4)
): Promise<Array<{ schema: string; applied: number }>> {
  if (!Number.isInteger(workerCount) || workerCount < 1) {
    throw new Error(`worker_count_invalid:${workerCount}`);
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`provision_concurrency_invalid:${concurrency}`);
  }
  const schemas = Array.from({ length: workerCount }, (_, i) => workerSchemaName(i));

  // Clean slate: drop ONLY the exact `bun_worker_<i>` schemas derived above.
  // Never a wildcard and never user input; `public` and non-worker schemas
  // are untouched. A drop failure aborts before any migration starts.
  const admin = postgres(databaseUrl, { max: 2 });
  try {
    for (const schema of schemas) {
      try {
        await admin.unsafe(`drop schema if exists "${schema}" cascade`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`provision_drop_failed:${schema}:${redactUrl(message, databaseUrl)}`);
      }
    }
  } finally {
    await admin.end();
  }

  // Migrate concurrently with bounded concurrency; each schema migrates
  // independently (the applier's per-schema `CREATE EXTENSION IF NOT EXISTS
  // pg_trgm` is safe under concurrency). migrateSchema errors propagate as
  // `migration_apply_failed:<tag>` and abort provisioning.
  const results: Array<{ schema: string; applied: number }> = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < schemas.length) {
      const schema = schemas[cursor++];
      const applied = await migrateSchema(databaseUrl, schema);
      results.push({ schema, applied });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.sort((a, b) => a.schema.localeCompare(b.schema));
}

// CLI: bun scripts/bun-lane-provision.ts <workers>
if (import.meta.main) {
  const rawWorkers = process.argv[2] ?? "8";
  const workers = Number(rawWorkers);
  if (!Number.isInteger(workers) || workers < 1 || workers > MAX_CLI_WORKERS) {
    throw new Error(`worker_count_invalid:${rawWorkers}`);
  }
  const url = process.env.DATABASE_DIRECT_URL;
  if (!url) throw new Error("DATABASE_DIRECT_URL_required");
  const results = await provisionWorkers(url, workers);
  for (const r of results) {
    console.log(`[bun-lane-provision] ${r.schema}: ${r.applied} applied`);
  }
}
