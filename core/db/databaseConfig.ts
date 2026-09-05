/**
 * Bun-free strict owner of database connection configuration and the cluster
 * connection budget (TASK-551-02-L01).
 *
 * This module MUST NOT import `db/client`, any driver, timer, filesystem, or
 * network facility, and it MUST NOT mutate `process.env`. It parses a plain
 * environment record into frozen, typed configuration objects and validates
 * the whole-process connection budget before startup.
 *
 * The same exported fleet parser (`parseDatabaseFleetConfig`) is consumed by
 * application identity and the migration rollout adapter; no other module may
 * own a second runtime/worker count parser.
 *
 * Secrets policy: `DATABASE_URL` and `DB_MAINTENANCE_URL` are secrets. They are
 * never returned, logged, or embedded in errors. Only the non-secret
 * `maintenanceUrlConfigured` presence boolean is exposed. Error messages carry
 * the machine-readable code and (optionally) the offending key NAME, never a
 * parsed value.
 */

/** Machine-readable failure codes emitted by this module. */
export const DATABASE_CONFIG_ERROR_CODES = {
  legacyKeyRejected: "database_env_legacy_key_rejected",
  keyUnknown: "database_env_key_unknown",
  valueInvalid: "database_env_value_invalid",
  valueOverflow: "database_env_value_overflow",
  valueOutOfRange: "database_env_value_out_of_range",
  enumInvalid: "database_env_enum_invalid",
  timeoutOrderingInvalid: "database_timeout_ordering_invalid",
  maintenanceUrlForbidden: "database_maintenance_url_forbidden",
  maintenanceUrlRequired: "database_maintenance_url_required",
  maintenanceUrlNotDistinct: "database_maintenance_url_not_distinct",
  connectionBudgetInvalid: "database_connection_budget_invalid",
  budgetOverflow: "database_connection_budget_overflow",
} as const;

/** Error thrown for every rejected database configuration input. */
export class DatabaseConfigError extends Error {
  readonly code: string;
  readonly key: string | null;

  constructor(code: string, key: string | null = null) {
    // The message carries only the code and the key NAME, never a raw value.
    super(key === null ? code : `${code}: ${key}`);
    this.name = "DatabaseConfigError";
    this.code = code;
    this.key = key;
  }
}

export type DatabasePgbouncerMode = "off" | "transaction";
export type DatabaseMaintenanceMode = "primary" | "direct" | "session";

export type DatabaseFleetConfig = Readonly<{
  runtimeProcessCount: number;
  workerProcessCount: number;
  totalProcessCount: number;
}>;

export type DatabaseRuntimeConfig = Readonly<{
  fleet: DatabaseFleetConfig;
  poolMax: number;
  serverMaxConnections: number;
  reservedConnections: number;
  migrationConnectionReserve: number;
  connectTimeoutSeconds: number;
  idleTimeoutSeconds: number;
  maxLifetimeSeconds: number;
  statementTimeoutMs: number;
  lockTimeoutMs: number;
  idleInTransactionTimeoutMs: number;
  pgbouncerMode: DatabasePgbouncerMode;
  maintenanceMode: DatabaseMaintenanceMode;
  maintenancePoolMax: number;
  /** Presence only; never the secret URL itself. */
  maintenanceUrlConfigured: boolean;
  /**
   * True only when the parsed combination can still become a session-affine
   * maintenance channel after L02's live probe: `off + primary` with primary
   * pool capacity >= 2, or an explicitly declared `direct|session` mode.
   * `transaction + primary` is permanently incapable. This is a capability
   * marker only: it never implies that retention/maintenance is enabled.
   */
  sessionAffineMaintenanceCandidate: boolean;
}>;

type Environment = Readonly<Record<string, string | undefined>>;

/** Every `DB_*` key this parser accepts. Anything else starting `DB_` fails. */
const KNOWN_DB_KEYS: ReadonlySet<string> = new Set([
  "DB_POOL_MAX",
  "DB_SERVER_MAX_CONNECTIONS",
  "DB_RESERVED_CONNECTIONS",
  "DB_MIGRATION_CONNECTION_RESERVE",
  "DB_CONNECT_TIMEOUT_SECONDS",
  "DB_IDLE_TIMEOUT_SECONDS",
  "DB_MAX_LIFETIME_SECONDS",
  "DB_STATEMENT_TIMEOUT_MS",
  "DB_LOCK_TIMEOUT_MS",
  "DB_IDLE_IN_TRANSACTION_TIMEOUT_MS",
  "DB_PGBOUNCER_MODE",
  "DB_MAINTENANCE_MODE",
  "DB_MAINTENANCE_POOL_MAX",
  "DB_MAINTENANCE_URL",
]);

/**
 * Superseded fleet declarations. Accepting either would permit a fleet
 * declaration that disagrees with application identity or the migration
 * adapter, so both parsers reject them outright.
 */
const LEGACY_FLEET_KEYS: ReadonlySet<string> = new Set([
  "DB_REPLICA_COUNT",
  "DB_WORKER_CONNECTION_RESERVE",
]);

const INTEGER_PATTERN = /^-?\d+$/;

function rejectLegacyFleetKeys(env: Environment): void {
  for (const key of Object.keys(env)) {
    if (LEGACY_FLEET_KEYS.has(key)) {
      throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.legacyKeyRejected, key);
    }
  }
}

function rejectUnknownAndLegacyDbKeys(env: Environment): void {
  for (const key of Object.keys(env)) {
    if (!key.startsWith("DB_") || KNOWN_DB_KEYS.has(key)) continue;
    if (LEGACY_FLEET_KEYS.has(key)) {
      throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.legacyKeyRejected, key);
    }
    throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.keyUnknown, key);
  }
}

function parseBoundedInteger(
  env: Environment,
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = env[key];
  // Only absence falls back to the default; an explicitly blank value fails.
  if (raw === undefined) return fallback;
  if (!INTEGER_PATTERN.test(raw)) {
    throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.valueInvalid, key);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.valueOverflow, key);
  }
  if (value < min || value > max) {
    throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.valueOutOfRange, key);
  }
  return value;
}

function parseExactEnum<T extends string>(
  env: Environment,
  key: string,
  fallback: T,
  allowed: readonly T[]
): T {
  const raw = env[key];
  if (raw === undefined) return fallback;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.enumInvalid, key);
  }
  return raw as T;
}

/**
 * Overflow-guarded budget arithmetic, rejecting with the machine-readable
 * `database_connection_budget_overflow` code before any unsafe sum/product is
 * used.
 *
 * Exported so the targeted suite can pin addition and multiplication overflow
 * rejection directly: inside the validated bounds every intermediate stays far
 * below `Number.MAX_SAFE_INTEGER` (at most 512 processes x 50 primary pools +
 * 512 x 4 maintenance pools + 8 migration reserve = 27,656), so the guards can
 * never fire through the parsers and are pinned at this seam instead.
 */
export function safeAdd(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(sum)) {
    throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.budgetOverflow);
  }
  return sum;
}

/** Multiplication counterpart of {@link safeAdd}; exported for the same pin. */
export function safeMultiply(a: number, b: number): number {
  const product = a * b;
  if (!Number.isSafeInteger(product)) {
    throw new DatabaseConfigError(DATABASE_CONFIG_ERROR_CODES.budgetOverflow);
  }
  return product;
}

/**
 * Sole owner of the runtime/worker fleet declaration shared by the connection
 * budget, per-process application identity, and the migration rollout adapter.
 */
export function parseDatabaseFleetConfig(env: Environment): DatabaseFleetConfig {
  rejectLegacyFleetKeys(env);
  const runtimeProcessCount = parseBoundedInteger(env, "CODERSO_RUNTIME_REPLICA_COUNT", 1, 1, 256);
  const workerProcessCount = parseBoundedInteger(env, "CODERSO_WORKER_REPLICA_COUNT", 0, 0, 256);
  return Object.freeze({
    runtimeProcessCount,
    workerProcessCount,
    totalProcessCount: safeAdd(runtimeProcessCount, workerProcessCount),
  });
}

function resolveMaintenanceUrlPolicy(
  env: Environment,
  pgbouncerMode: DatabasePgbouncerMode,
  maintenanceMode: DatabaseMaintenanceMode
): { configured: boolean; candidate: boolean } {
  const rawUrl = env.DB_MAINTENANCE_URL;
  const configured = rawUrl !== undefined && rawUrl !== "";
  if (configured && rawUrl !== undefined && rawUrl.trim() === "") {
    // A whitespace-only URL counts as absent-but-typed: rejected, never stored.
    throw new DatabaseConfigError(
      DATABASE_CONFIG_ERROR_CODES.maintenanceUrlRequired,
      "DB_MAINTENANCE_URL"
    );
  }

  if (maintenanceMode === "primary") {
    if (configured) {
      throw new DatabaseConfigError(
        DATABASE_CONFIG_ERROR_CODES.maintenanceUrlForbidden,
        "DB_MAINTENANCE_URL"
      );
    }
    const candidate = pgbouncerMode === "off";
    return { configured: false, candidate };
  }

  if (!configured) {
    throw new DatabaseConfigError(
      DATABASE_CONFIG_ERROR_CODES.maintenanceUrlRequired,
      "DB_MAINTENANCE_URL"
    );
  }

  // Transaction-pooled main channel can never double as the maintenance
  // channel; a byte-identical URL is rejected without exposing either value.
  if (
    pgbouncerMode === "transaction" &&
    env.DATABASE_URL !== undefined &&
    rawUrl === env.DATABASE_URL
  ) {
    throw new DatabaseConfigError(
      DATABASE_CONFIG_ERROR_CODES.maintenanceUrlNotDistinct,
      "DB_MAINTENANCE_URL"
    );
  }

  return { configured: true, candidate: true };
}

/**
 * Parses and cross-validates the complete database runtime configuration and
 * enforces the cluster connection budget before anything connects.
 */
export function parseDatabaseRuntimeConfig(env: Environment): DatabaseRuntimeConfig {
  rejectUnknownAndLegacyDbKeys(env);

  const fleet = parseDatabaseFleetConfig(env);
  const poolMax = parseBoundedInteger(env, "DB_POOL_MAX", 10, 1, 50);
  const serverMaxConnections = parseBoundedInteger(
    env,
    "DB_SERVER_MAX_CONNECTIONS",
    103,
    10,
    10_000
  );
  const reservedConnections = parseBoundedInteger(env, "DB_RESERVED_CONNECTIONS", 21, 1, 5_000);
  const migrationConnectionReserve = parseBoundedInteger(
    env,
    "DB_MIGRATION_CONNECTION_RESERVE",
    3,
    3,
    8
  );
  const connectTimeoutSeconds = parseBoundedInteger(env, "DB_CONNECT_TIMEOUT_SECONDS", 10, 1, 60);
  const idleTimeoutSeconds = parseBoundedInteger(env, "DB_IDLE_TIMEOUT_SECONDS", 30, 1, 600);
  const maxLifetimeSeconds = parseBoundedInteger(env, "DB_MAX_LIFETIME_SECONDS", 1800, 60, 86_400);
  const statementTimeoutMs = parseBoundedInteger(
    env,
    "DB_STATEMENT_TIMEOUT_MS",
    15_000,
    100,
    120_000
  );
  const lockTimeoutMs = parseBoundedInteger(env, "DB_LOCK_TIMEOUT_MS", 5_000, 50, 30_000);
  const idleInTransactionTimeoutMs = parseBoundedInteger(
    env,
    "DB_IDLE_IN_TRANSACTION_TIMEOUT_MS",
    30_000,
    1_000,
    120_000
  );

  if (lockTimeoutMs > statementTimeoutMs) {
    throw new DatabaseConfigError(
      DATABASE_CONFIG_ERROR_CODES.timeoutOrderingInvalid,
      "DB_LOCK_TIMEOUT_MS"
    );
  }

  const pgbouncerMode = parseExactEnum<DatabasePgbouncerMode>(env, "DB_PGBOUNCER_MODE", "off", [
    "off",
    "transaction",
  ]);
  const maintenanceMode = parseExactEnum<DatabaseMaintenanceMode>(
    env,
    "DB_MAINTENANCE_MODE",
    "primary",
    ["primary", "direct", "session"]
  );
  const maintenancePoolMax = parseBoundedInteger(env, "DB_MAINTENANCE_POOL_MAX", 2, 2, 4);

  const maintenance = resolveMaintenanceUrlPolicy(env, pgbouncerMode, maintenanceMode);

  // Cluster connection budget. Every runtime and worker process owns one
  // primary pool, plus one dedicated maintenance pool per process when a
  // direct/session maintenance mode is declared, plus the migration reserve
  // (one advisory-lock session plus two visibility probes, hence >= 3).
  const minimumReserved = Math.ceil((serverMaxConnections * 20) / 100);
  const primaryPools = safeMultiply(poolMax, fleet.totalProcessCount);
  const maintenancePools =
    maintenanceMode === "primary" ? 0 : safeMultiply(maintenancePoolMax, fleet.totalProcessCount);
  const planned = safeAdd(safeAdd(primaryPools, maintenancePools), migrationConnectionReserve);
  const available = safeAdd(serverMaxConnections, -reservedConnections);
  if (reservedConnections < minimumReserved || available <= 0 || planned >= available) {
    throw new DatabaseConfigError(
      DATABASE_CONFIG_ERROR_CODES.connectionBudgetInvalid,
      "DB_SERVER_MAX_CONNECTIONS"
    );
  }

  return Object.freeze({
    fleet,
    poolMax,
    serverMaxConnections,
    reservedConnections,
    migrationConnectionReserve,
    connectTimeoutSeconds,
    idleTimeoutSeconds,
    maxLifetimeSeconds,
    statementTimeoutMs,
    lockTimeoutMs,
    idleInTransactionTimeoutMs,
    pgbouncerMode,
    maintenanceMode,
    maintenancePoolMax,
    maintenanceUrlConfigured: maintenance.configured,
    sessionAffineMaintenanceCandidate:
      maintenanceMode === "primary"
        ? pgbouncerMode === "off" && poolMax >= 2
        : maintenance.candidate,
  });
}
