/**
 * Two-target database connection model.
 *
 * Render exposes the same database twice: the PostgreSQL backend directly on
 * port 5432, and a PgBouncer transaction pooler on port 6432 (`pool_mode =
 * transaction`, `max_client_conn = 30000`, with 10 backend connections reserved
 * for direct access). The pooler is the better default — it skips the backend
 * fork on every new connection, which is the dominant cost for short-lived
 * processes — and it adds no measurable per-query latency, including for
 * prepared statements.
 *
 * The pooler cannot serve SESSION-level state. Under `pool_mode = transaction`
 * a client is handed a backend for the duration of a transaction only, so a
 * `pg_advisory_lock` taken in one transaction and a `pg_advisory_unlock` issued
 * in the next may land on different backends: the unlock returns false and the
 * lock leaks for the lifetime of the original backend. For startup migrations,
 * whose entire purpose is to serialise concurrent boots, that is a correctness
 * failure and not a performance nuance.
 *
 * Hence two targets:
 *   - the DEFAULT target (`DATABASE_URL`) points at the pooler and serves every
 *     transactional caller: HTTP request handling, services, and the smoke
 *     harness bridge subprocesses;
 *   - the SESSION target (`DATABASE_DIRECT_URL`) points at the direct port and
 *     is opened only by the paths that need session-scoped semantics.
 *
 * The direct URL is configured explicitly rather than derived from the default
 * one by rewriting the port: deriving it would hard-code "Render puts the
 * pooler on +1000" as a permanent fact of the deployment target. When it is not
 * configured we fall back to `DATABASE_URL`, but the fallback is fail-closed:
 * if that URL is (or might be) the pooler, session-lock callers refuse to run
 * instead of silently leaking their lock.
 *
 * This module is intentionally free of driver imports so it can be unit-tested
 * and imported without opening a connection.
 */

export type DatabaseEnvMap = Record<string, string | undefined>;

export const DATABASE_URL_ENV = "DATABASE_URL";
export const DATABASE_DIRECT_URL_ENV = "DATABASE_DIRECT_URL";
export const DATABASE_POOLED_PORT_ENV = "DATABASE_POOLED_PORT";

/** PgBouncer's port on Render. Overridable via `DATABASE_POOLED_PORT`. */
export const DEFAULT_POOLED_DATABASE_PORT = 6432;

/** postgres.js connects on 5432 when the connection string omits the port. */
export const DEFAULT_POSTGRES_PORT = 5432;

export type DatabaseUrlInspection = {
  /**
   * Port the driver will connect on, or `null` when the connection string is
   * not a parsable URL (a libpq key=value DSN, for instance). `null` means
   * "cannot be verified", never "safe".
   */
  port: number | null;
  /** True only when the port is known AND equals the configured pooler port. */
  pooled: boolean;
};

export type SessionDatabaseTargetSource = "direct_url_env" | "database_url_fallback";

export type SessionDatabaseTarget = {
  url: string;
  port: number | null;
  source: SessionDatabaseTargetSource;
};

export type DefaultDatabaseTarget = {
  url: string;
  port: number | null;
  pooled: boolean;
};

const normalizeOptionalString = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

/**
 * Resolve the port PgBouncer is expected on. Misconfiguring this would silently
 * disable the session-lock guard, so an unusable value is a hard error.
 */
export function resolvePooledDatabasePort(env: DatabaseEnvMap = process.env): number {
  const configured = normalizeOptionalString(env[DATABASE_POOLED_PORT_ENV]);
  if (!configured) return DEFAULT_POOLED_DATABASE_PORT;

  const parsed = Number(configured);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `database_pooled_port_invalid: ${DATABASE_POOLED_PORT_ENV} must be an integer port ` +
        `between 1 and 65535 (got ${JSON.stringify(configured)}).`
    );
  }
  return parsed;
}

/**
 * Inspect a connection string without connecting. Never returns or logs the
 * credentials it was given.
 */
export function inspectDatabaseUrl(url: string, pooledPort: number): DatabaseUrlInspection {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { port: null, pooled: false };
  }

  const port = parsed.port === "" ? DEFAULT_POSTGRES_PORT : Number(parsed.port);
  if (!Number.isInteger(port)) {
    return { port: null, pooled: false };
  }

  return { port, pooled: port === pooledPort };
}

/**
 * Resolve the default (pooled) target used by `core/db/client.ts`. Kept
 * permissive about the port: pointing the default client at the direct port
 * still works, it just forgoes the connect-time saving.
 */
export function resolveDefaultDatabaseTarget(
  env: DatabaseEnvMap = process.env
): DefaultDatabaseTarget {
  const url = normalizeOptionalString(env[DATABASE_URL_ENV]);
  if (!url) {
    throw new Error(`${DATABASE_URL_ENV} is not set`);
  }

  const inspection = inspectDatabaseUrl(url, resolvePooledDatabasePort(env));
  return { url, port: inspection.port, pooled: inspection.pooled };
}

const pooledPortHint = (pooledPort: number) =>
  `Session-level advisory locks taken through a transaction pooler are released on a ` +
  `different backend, so the unlock returns false and the lock leaks. Set ` +
  `${DATABASE_DIRECT_URL_ENV} to the direct (non-pooled) connection string for the same ` +
  `database — on Render that is the same host on port ${DEFAULT_POSTGRES_PORT} instead of ` +
  `${pooledPort}.`;

/**
 * Resolve the connection string for a caller that requires session-scoped
 * semantics (`pg_advisory_lock`, and anything else that outlives a single
 * transaction).
 *
 * Fails closed and loud rather than degrading: a deployment that pools
 * everything and silently breaks its migration lock is worse than one that
 * refuses to start.
 *
 * @param purpose short identifier of the calling path, used in error messages.
 */
export function resolveSessionDatabaseTarget(
  purpose: string,
  env: DatabaseEnvMap = process.env
): SessionDatabaseTarget {
  const pooledPort = resolvePooledDatabasePort(env);
  const directUrl = normalizeOptionalString(env[DATABASE_DIRECT_URL_ENV]);

  if (directUrl) {
    const inspection = inspectDatabaseUrl(directUrl, pooledPort);
    if (inspection.pooled) {
      throw new Error(
        `session_database_direct_url_pooled: ${DATABASE_DIRECT_URL_ENV} points at port ` +
          `${pooledPort}, which is the transaction pooler, so it is not a direct connection. ` +
          `${purpose} needs a session-scoped connection. ${pooledPortHint(pooledPort)}`
      );
    }
    return { url: directUrl, port: inspection.port, source: "direct_url_env" };
  }

  const fallbackUrl = normalizeOptionalString(env[DATABASE_URL_ENV]);
  if (!fallbackUrl) {
    throw new Error(
      `session_database_url_missing: ${purpose} needs a database connection but neither ` +
        `${DATABASE_DIRECT_URL_ENV} nor ${DATABASE_URL_ENV} is set.`
    );
  }

  const inspection = inspectDatabaseUrl(fallbackUrl, pooledPort);

  if (inspection.pooled) {
    throw new Error(
      `session_database_url_pooled: ${purpose} needs a session-scoped connection but ` +
        `${DATABASE_DIRECT_URL_ENV} is not set and ${DATABASE_URL_ENV} points at port ` +
        `${pooledPort}, which is the transaction pooler. ${pooledPortHint(pooledPort)}`
    );
  }

  if (inspection.port === null) {
    // The fallback cannot be proven pooler-free, so we do not assume it is.
    throw new Error(
      `session_database_url_unverifiable: ${purpose} needs a session-scoped connection but ` +
        `${DATABASE_DIRECT_URL_ENV} is not set and ${DATABASE_URL_ENV} is not a parsable ` +
        `connection URL, so it cannot be checked against the transaction pooler port ` +
        `${pooledPort}. Set ${DATABASE_DIRECT_URL_ENV} explicitly.`
    );
  }

  return { url: fallbackUrl, port: inspection.port, source: "database_url_fallback" };
}

/**
 * One-line, credential-free description of a resolved session target, for boot
 * logs and warnings.
 */
export function describeSessionDatabaseTarget(target: SessionDatabaseTarget): string {
  const port = target.port === null ? "unknown port" : `port ${target.port}`;
  return target.source === "direct_url_env"
    ? `${DATABASE_DIRECT_URL_ENV} (${port})`
    : `${DATABASE_URL_ENV} fallback (${port}, not pooled)`;
}
