import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  describeSessionDatabaseTarget,
  resolveSessionDatabaseTarget,
} from "../db/connectionTargets";

export const STARTUP_MIGRATIONS_ENV = "CODERSO_RUN_MIGRATIONS_ON_START";
export const STARTUP_MIGRATIONS_FOLDER_ENV = "CODERSO_MIGRATIONS_FOLDER";

const DISABLED_STARTUP_MIGRATION_VALUES = new Set(["0", "false", "no", "off", "skip", "disabled"]);

const DEFAULT_STARTUP_MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../db/migrations", import.meta.url)
);
const STARTUP_MIGRATIONS_LOCK_NAMESPACE = 20260604;
const STARTUP_MIGRATIONS_LOCK_KEY = 400;

/**
 * Session-lock purpose id, surfaced in the fail-closed error when the resolved
 * connection would route this lock through the transaction pooler.
 *
 * This lock CANNOT become `pg_advisory_xact_lock`: it has to be held across the
 * drizzle migrator's whole run, and the migrator opens a transaction per
 * migration file. A transaction-scoped lock would be released after the first
 * file, which defeats the point of serialising concurrent boots.
 */
export const STARTUP_MIGRATIONS_SESSION_PURPOSE = "startup database migrations";

type EnvMap = Record<string, string | undefined>;

export type StartupMigrationDecision = {
  enabled: boolean;
  reason: string;
};

export type StartupMigrationInput = {
  /**
   * DIRECT (non-pooled) connection string. The same single connection holds the
   * session advisory lock and runs the migrator, so it must not be routed
   * through a transaction pooler — `runStartupMigrations` resolves it via
   * `resolveSessionDatabaseTarget`, which refuses a pooled port.
   */
  databaseUrl: string;
  migrationsFolder: string;
};

export type StartupMigrationFn = (input: StartupMigrationInput) => Promise<void>;

export type StartupMigrationResult =
  | {
      ran: false;
      reason: string;
    }
  | {
      ran: true;
      migrationsFolder: string;
    };

export type StartupMigrationLogger = Pick<Console, "error" | "log">;

export type StartupMigrationLock = {
  acquire: () => Promise<unknown>;
  release: () => Promise<unknown>;
};

export type RunStartupMigrationsOptions = {
  cwd?: string;
  env?: EnvMap;
  logger?: StartupMigrationLogger;
  migrate?: StartupMigrationFn;
};

export function resolveStartupMigrationDecision(
  env: EnvMap = process.env
): StartupMigrationDecision {
  const rawValue = env[STARTUP_MIGRATIONS_ENV]?.trim().toLowerCase();

  if (rawValue && DISABLED_STARTUP_MIGRATION_VALUES.has(rawValue)) {
    return {
      enabled: false,
      reason: `${STARTUP_MIGRATIONS_ENV}=${rawValue}`,
    };
  }

  return {
    enabled: true,
    reason: rawValue ? `${STARTUP_MIGRATIONS_ENV}=${rawValue}` : "default_enabled",
  };
}

export function resolveStartupMigrationsFolder(
  env: EnvMap = process.env,
  cwd: string = process.cwd()
): string {
  const configuredFolder = env[STARTUP_MIGRATIONS_FOLDER_ENV]?.trim();

  if (!configuredFolder) {
    return DEFAULT_STARTUP_MIGRATIONS_FOLDER;
  }

  return resolve(cwd, configuredFolder);
}

/**
 * `max: 1` on purpose: one connection, one session, so the advisory lock taken
 * before the migrator and released after it is guaranteed to be the same
 * backend. `databaseUrl` must therefore be the direct target — the caller
 * enforces that.
 */
export async function runDrizzleStartupMigrations({
  databaseUrl,
  migrationsFolder,
}: StartupMigrationInput): Promise<void> {
  const postgresModule = await import("postgres");
  const drizzleModule = await import("drizzle-orm/postgres-js");
  const migratorModule = await import("drizzle-orm/postgres-js/migrator");

  const client = postgresModule.default(databaseUrl, { max: 1 });

  try {
    const db = drizzleModule.drizzle(client);
    await runWithStartupMigrationLock(
      {
        acquire: async () => {
          await client`select pg_advisory_lock(${STARTUP_MIGRATIONS_LOCK_NAMESPACE}, ${STARTUP_MIGRATIONS_LOCK_KEY})`;
        },
        release: async () => {
          await client`select pg_advisory_unlock(${STARTUP_MIGRATIONS_LOCK_NAMESPACE}, ${STARTUP_MIGRATIONS_LOCK_KEY})`;
        },
      },
      async () => {
        await migratorModule.migrate(db, { migrationsFolder });
      }
    );
  } finally {
    await client.end();
  }
}

export async function runWithStartupMigrationLock<T>(
  lock: StartupMigrationLock,
  action: () => Promise<T>
): Promise<T> {
  await lock.acquire();

  let result: T;
  let actionFailed = false;
  let actionError: unknown;

  try {
    result = await action();
  } catch (error) {
    actionFailed = true;
    actionError = error;
  }

  let releaseFailed = false;
  let releaseError: unknown;

  try {
    await lock.release();
  } catch (error) {
    releaseFailed = true;
    releaseError = error;
  }

  if (actionFailed) {
    throw actionError;
  }

  if (releaseFailed) {
    throw releaseError;
  }

  return result!;
}

export async function runStartupMigrations(
  options: RunStartupMigrationsOptions = {}
): Promise<StartupMigrationResult> {
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const decision = resolveStartupMigrationDecision(env);

  if (!decision.enabled) {
    logger.log(`[startup] Database migrations skipped (${decision.reason})`);
    return { ran: false, reason: decision.reason };
  }

  if (!env.DATABASE_URL?.trim() && !env.DATABASE_DIRECT_URL?.trim()) {
    throw new Error("startup_migrations_database_url_missing");
  }

  // Direct connection: this lock is session-scoped and must survive the whole
  // migrator run, so a transaction pooler would leak it (see connectionTargets).
  const sessionTarget = resolveSessionDatabaseTarget(STARTUP_MIGRATIONS_SESSION_PURPOSE, env);
  const databaseUrl = sessionTarget.url;

  const migrationsFolder = resolveStartupMigrationsFolder(env, options.cwd ?? process.cwd());
  const migrate = options.migrate ?? runDrizzleStartupMigrations;

  logger.log(
    `[startup] Running database migrations from ${migrationsFolder} via ` +
      `${describeSessionDatabaseTarget(sessionTarget)}`
  );

  try {
    await migrate({ databaseUrl, migrationsFolder });
  } catch (error) {
    logger.error(
      `[startup] Database migrations failed: ${formatStartupMigrationError(error, [
        databaseUrl,
        env.DATABASE_URL,
      ])}`
    );
    throw error;
  }

  logger.log("[startup] Database migrations completed");
  return { ran: true, migrationsFolder };
}

function formatStartupMigrationError(
  error: unknown,
  databaseUrls: readonly (string | undefined)[]
): string {
  const message = error instanceof Error ? error.message : String(error);

  if (!message) {
    return "unknown error";
  }

  // Redact every connection string in play: the pooled default and the direct
  // one can differ, and either may appear verbatim in a driver error.
  let redacted = message;
  for (const url of databaseUrls) {
    const trimmed = url?.trim();
    if (trimmed) {
      redacted = redacted.split(trimmed).join("[redacted]");
    }
  }
  return redacted;
}
