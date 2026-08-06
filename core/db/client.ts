import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import {
  resolveDatabasePoolMax,
  resolveDefaultDatabaseTarget,
  type DefaultDatabaseTarget,
} from "./connectionTargets";

/**
 * The DEFAULT database client. Points at whatever `DATABASE_URL` names, which in
 * a pooled deployment is Render's transaction pooler (port 6432).
 *
 * Safe through a transaction pooler and therefore fine to use here: single
 * statements, `db.transaction(...)` (transaction pooling pins one backend for
 * the whole transaction, so `pg_advisory_xact_lock` works — see
 * `core/services/admin/firstRunService.ts`), and postgres.js prepared
 * statements (measured: still 1 round trip through the pooler, so `prepare` is
 * left at its default `true`).
 *
 * NOT safe here, and deliberately absent from the codebase: session-level
 * `pg_advisory_lock`, `LISTEN`/`NOTIFY`, temporary tables and session `SET`.
 * Those callers must use `withSessionDatabaseClient` from `./sessionClient`.
 */
const poolMax = resolveDatabasePoolMax();
const defaultTarget: DefaultDatabaseTarget = resolveDefaultDatabaseTarget();

/**
 * `DB_POOL_MAX` still bounds client-side sockets. Behind the pooler it no longer
 * maps one-to-one onto database backends (`max_client_conn = 30000`), so it is a
 * concurrency knob for this process rather than a database-capacity limit.
 */
const client = postgres(defaultTarget.url, {
  max: poolMax,
});

export const db = drizzle(client, { schema });

export const closeDatabase = async (): Promise<void> => {
  await client.end();
};
