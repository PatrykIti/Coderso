import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STARTUP_MIGRATIONS_ENV = "CODERSO_RUN_MIGRATIONS_ON_START";
export const STARTUP_MIGRATIONS_FOLDER_ENV = "CODERSO_MIGRATIONS_FOLDER";

const DISABLED_STARTUP_MIGRATION_VALUES = new Set(["0", "false", "no", "off", "skip", "disabled"]);

const DEFAULT_STARTUP_MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../db/migrations", import.meta.url)
);
const STARTUP_MIGRATIONS_LOCK_NAMESPACE = 20260604;
const STARTUP_MIGRATIONS_LOCK_KEY = 400;

type EnvMap = Record<string, string | undefined>;

export type StartupMigrationDecision = {
  enabled: boolean;
  reason: string;
};

export type StartupMigrationInput = {
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

  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("startup_migrations_database_url_missing");
  }

  const migrationsFolder = resolveStartupMigrationsFolder(env, options.cwd ?? process.cwd());
  const migrate = options.migrate ?? runDrizzleStartupMigrations;

  logger.log(`[startup] Running database migrations from ${migrationsFolder}`);

  try {
    await migrate({ databaseUrl, migrationsFolder });
  } catch (error) {
    logger.error(
      `[startup] Database migrations failed: ${formatStartupMigrationError(error, databaseUrl)}`
    );
    throw error;
  }

  logger.log("[startup] Database migrations completed");
  return { ran: true, migrationsFolder };
}

function formatStartupMigrationError(error: unknown, databaseUrl: string): string {
  const message = error instanceof Error ? error.message : String(error);

  if (!message) {
    return "unknown error";
  }

  return message.split(databaseUrl).join("[redacted]");
}
