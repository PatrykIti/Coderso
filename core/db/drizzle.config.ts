import type { Config } from "drizzle-kit";

import { describeSessionDatabaseTarget, resolveSessionDatabaseTarget } from "./connectionTargets";

/**
 * Session-lock purpose id for the drizzle-kit CLI (see `./connectionTargets.ts`).
 *
 * Kept distinct from `STARTUP_MIGRATIONS_SESSION_PURPOSE` so a fail-closed error
 * names which of the two migration paths refused to run.
 */
export const DRIZZLE_CLI_SESSION_PURPOSE = "drizzle-kit CLI migrations";

/**
 * The documented CLI path (`bun run db:migrate`, `bun run db:generate`) must
 * reach the database on the SAME direct/session target as
 * `runStartupMigrations`, not on `DATABASE_URL`.
 *
 * `DATABASE_URL` now points at Render's PgBouncer transaction pooler, and
 * migrations are exactly the workload that must not be pooled: under
 * `pool_mode = transaction` a client holds a backend only for the duration of a
 * transaction, so a `pg_advisory_lock` and its matching unlock can land on
 * different backends and the lock leaks. `runStartupMigrations` was moved to the
 * direct target for that reason; resolving `process.env.DATABASE_URL` here left
 * the two migration paths disagreeing about which endpoint they migrate through,
 * so the boot path was pooler-safe while the documented CLI path silently was
 * not.
 *
 * Routing both through `resolveSessionDatabaseTarget` also inherits its
 * fail-closed behaviour: rather than degrading to a pooled connection it refuses
 * outright, and the error names `DATABASE_DIRECT_URL` as the remedy. Resolution
 * happens at config load, so drizzle-kit reports the problem before it connects
 * or touches a migration file.
 */
const sessionTarget = resolveSessionDatabaseTarget(DRIZZLE_CLI_SESSION_PURPOSE);

// Credential-free by construction (describeSessionDatabaseTarget prints the env
// var name and port only), so the operator can see which endpoint a migration
// actually went through.
console.log(`[drizzle-kit] Using ${describeSessionDatabaseTarget(sessionTarget)}`);

export default {
  schema: "./core/db/schema.ts",
  out: "./core/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: sessionTarget.url },
} satisfies Config;
