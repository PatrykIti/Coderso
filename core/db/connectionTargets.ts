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
 * BOTH paths are fail-closed, and on the same rule: a session target is only
 * accepted when the port the driver will connect on can be read AND is not the
 * pooler port. "Could not read it" is never treated as "not the pooler". Two
 * connection-string shapes make that distinction load-bearing:
 *
 *   - a comma-separated host list (`host-a:5432,host-b:6432`) — libpq syntax
 *     that postgres.js supports by rewriting the URL to the first host and
 *     failing over between the rest, so `new URL` rejecting the string says
 *     nothing about whether the driver will connect, and one port says nothing
 *     about which host it lands on. Such a list can name the direct port and the
 *     pooler port at the same time;
 *   - a URL with no port, when `PGPORT` is set — the driver prefers `PGPORT`
 *     over 5432, so the port to check is `PGPORT`, not the default.
 *
 * This module is intentionally free of driver imports so it can be unit-tested
 * and imported without opening a connection. It does encode two facts about the
 * driver's connection-string handling (the two shapes above); they are asserted
 * in `tests/vitest/server/databaseConnectionTargets.test.ts` and the failure
 * direction is safe — a driver that stopped supporting multi-host strings would
 * make this module refuse a string that no longer connects anyway.
 */

export type DatabaseEnvMap = Record<string, string | undefined>;

export const DATABASE_URL_ENV = "DATABASE_URL";
export const DATABASE_DIRECT_URL_ENV = "DATABASE_DIRECT_URL";
export const DATABASE_POOLED_PORT_ENV = "DATABASE_POOLED_PORT";

/**
 * libpq's port variable. postgres.js resolves a connection's port as
 * `options.port || url.port || PGPORT || 5432`, so a connection string with no
 * port is checked against `PGPORT` when one is set — otherwise the guard would
 * clear a URL as "port 5432, not pooled" while the driver dialled the pooler.
 *
 * Read from the env map the caller passed, never from ambient state behind the
 * caller's back. Callers that pass `process.env` — `core/db/drizzle.config.ts`
 * does, at module load — are therefore checked against the operator's real
 * `PGPORT`, which is the point: a developer with a local Postgres on a
 * non-default port has an environment where the port matters.
 *
 * Deliberately not exported: nothing outside this module needs the name, and the
 * test names the variable literally so it exercises libpq's contract rather than
 * a re-export of this constant.
 */
const PGPORT_ENV = "PGPORT";

/** PgBouncer's port on Render. Overridable via `DATABASE_POOLED_PORT`. */
export const DEFAULT_POOLED_DATABASE_PORT = 6432;

/** postgres.js connects on 5432 when the connection string omits the port. */
export const DEFAULT_POSTGRES_PORT = 5432;

/** Why a connection string could not be resolved to one known port. */
export type DatabaseUrlUnverifiableReason =
  /** Not a URL we can read an authority and a port out of. */
  | "unparsable_url"
  /**
   * The authority is a comma-separated host list. The driver accepts these and
   * fails over between the entries, so no single port describes the connection.
   */
  | "multiple_hosts"
  /** The URL omits a port and `PGPORT`, which the driver uses next, is unusable. */
  | "env_port_invalid";

/**
 * Result of inspecting a connection string without connecting.
 *
 * A discriminated union rather than a nullable port, so "I could not check this"
 * cannot be misread as "this is not the pooler". Callers that must be sure test
 * `verified`; `resolveSessionDatabaseTarget` refuses anything that is not.
 */
export type DatabaseUrlInspection =
  | {
      verified: true;
      /** The single port the driver will connect on. */
      port: number;
      /** True when that port is the configured pooler port. */
      pooled: boolean;
    }
  | {
      verified: false;
      port: null;
      pooled: false;
      reason: DatabaseUrlUnverifiableReason;
    };

export type SessionDatabaseTargetSource = "direct_url_env" | "database_url_fallback";

export type SessionDatabaseTarget = {
  url: string;
  /**
   * Always a verified port: the resolver refuses a target whose port it cannot
   * read, so there is no "unknown port" session target to represent.
   */
  port: number;
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

const unverifiable = (reason: DatabaseUrlUnverifiableReason): DatabaseUrlInspection => ({
  verified: false,
  port: null,
  pooled: false,
  reason,
});

/**
 * Extract the host authority the way the driver does before handing the string
 * to `new URL`: everything after `://`, cut at the first `/` or `?`, then
 * everything after the first `@`, percent-decoded.
 *
 * This is what makes a multi-host string visible. The driver reads the authority
 * from the raw string and rewrites the URL to the FIRST host before parsing it,
 * so a comma-separated list that `new URL` rejects outright still connects, and
 * a list that `new URL` happens to accept lands in `URL.hostname` as one blob.
 * Neither route lets `URL.port` describe where the connection goes.
 *
 * Returns null when there is no `://` or the authority is not decodable — both
 * mean "cannot be inspected".
 */
const extractDriverAuthority = (url: string): string | null => {
  const schemeSeparator = url.indexOf("://");
  if (schemeSeparator < 0) return null;

  const afterScheme = url.slice(schemeSeparator + 3).split(/[?/]/)[0] ?? "";
  const authority = afterScheme.slice(afterScheme.indexOf("@") + 1);
  try {
    return decodeURIComponent(authority);
  } catch {
    return null;
  }
};

/**
 * Port the driver uses when the connection string omits one: `PGPORT` if it is
 * set and usable, otherwise 5432. Null means `PGPORT` is set to something that
 * is not a port, so the effective port is unknowable from configuration alone.
 */
const resolveImplicitPort = (env: DatabaseEnvMap): number | null => {
  const configured = normalizeOptionalString(env[PGPORT_ENV]);
  if (!configured) return DEFAULT_POSTGRES_PORT;

  const parsed = Number(configured);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : null;
};

/**
 * Inspect a connection string without connecting. Never returns or logs the
 * credentials it was given.
 *
 * Fails closed: anything that does not resolve to the one port the driver will
 * connect on comes back `verified: false`, which callers must treat as "might be
 * the pooler".
 */
export function inspectDatabaseUrl(
  url: string,
  pooledPort: number,
  env: DatabaseEnvMap = process.env
): DatabaseUrlInspection {
  const authority = extractDriverAuthority(url);
  if (authority === null) return unverifiable("unparsable_url");
  if (authority.includes(",")) return unverifiable("multiple_hosts");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return unverifiable("unparsable_url");
  }

  if (parsed.port === "") {
    const implicitPort = resolveImplicitPort(env);
    if (implicitPort === null) return unverifiable("env_port_invalid");
    return { verified: true, port: implicitPort, pooled: implicitPort === pooledPort };
  }

  const port = Number(parsed.port);
  if (!Number.isInteger(port)) return unverifiable("unparsable_url");

  return { verified: true, port, pooled: port === pooledPort };
}

/**
 * Resolve the default (pooled) target used by `core/db/client.ts`. Kept
 * permissive about the port: pointing the default client at the direct port
 * still works, it just forgoes the connect-time saving. An unverifiable URL is
 * reported as `port: null, pooled: false` and still accepted — every caller of
 * the default client is transactional, so the pooler question is informational
 * here, not a correctness gate.
 */
export function resolveDefaultDatabaseTarget(
  env: DatabaseEnvMap = process.env
): DefaultDatabaseTarget {
  const url = normalizeOptionalString(env[DATABASE_URL_ENV]);
  if (!url) {
    throw new Error(`${DATABASE_URL_ENV} is not set`);
  }

  const inspection = inspectDatabaseUrl(url, resolvePooledDatabasePort(env), env);
  return { url, port: inspection.port, pooled: inspection.pooled };
}

const pooledPortHint = (pooledPort: number) =>
  `Session-level advisory locks taken through a transaction pooler are released on a ` +
  `different backend, so the unlock returns false and the lock leaks. Set ` +
  `${DATABASE_DIRECT_URL_ENV} to the direct (non-pooled) connection string for the same ` +
  `database — on Render that is the same host on port ${DEFAULT_POSTGRES_PORT} instead of ` +
  `${pooledPort}.`;

/** Credential-free explanation of why a connection string could not be checked. */
const unverifiableReasonHint = (reason: DatabaseUrlUnverifiableReason): string => {
  if (reason === "multiple_hosts") {
    return (
      "it names several comma-separated hosts, which the driver fails over between, so no " +
      "single port describes where the connection lands (such a list can name the direct port " +
      "and the pooler port at once)"
    );
  }
  if (reason === "env_port_invalid") {
    return (
      `it omits a port and ${PGPORT_ENV} — which the driver would use instead of ` +
      `${DEFAULT_POSTGRES_PORT} — is not a port number between 1 and 65535`
    );
  }
  return "it is not a parsable connection URL, so its port cannot be read";
};

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
    const inspection = inspectDatabaseUrl(directUrl, pooledPort, env);
    if (inspection.pooled) {
      throw new Error(
        `session_database_direct_url_pooled: ${DATABASE_DIRECT_URL_ENV} points at port ` +
          `${pooledPort}, which is the transaction pooler, so it is not a direct connection. ` +
          `${purpose} needs a session-scoped connection. ${pooledPortHint(pooledPort)}`
      );
    }

    if (!inspection.verified) {
      // Being configured explicitly is not evidence of being direct. An
      // unreadable port means the pooler has not been ruled out, and this branch
      // fails closed on exactly the same rule as the fallback below.
      throw new Error(
        `session_database_direct_url_unverifiable: ${purpose} needs a session-scoped ` +
          `connection but ${DATABASE_DIRECT_URL_ENV} cannot be verified as direct — ` +
          `${unverifiableReasonHint(inspection.reason)}. Set ${DATABASE_DIRECT_URL_ENV} to a ` +
          `single-host connection URL with an explicit port. ${pooledPortHint(pooledPort)}`
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

  const inspection = inspectDatabaseUrl(fallbackUrl, pooledPort, env);

  if (inspection.pooled) {
    throw new Error(
      `session_database_url_pooled: ${purpose} needs a session-scoped connection but ` +
        `${DATABASE_DIRECT_URL_ENV} is not set and ${DATABASE_URL_ENV} points at port ` +
        `${pooledPort}, which is the transaction pooler. ${pooledPortHint(pooledPort)}`
    );
  }

  if (!inspection.verified) {
    // The fallback cannot be proven pooler-free, so we do not assume it is.
    throw new Error(
      `session_database_url_unverifiable: ${purpose} needs a session-scoped connection but ` +
        `${DATABASE_DIRECT_URL_ENV} is not set and ${DATABASE_URL_ENV} cannot be checked ` +
        `against the transaction pooler port ${pooledPort} — ` +
        `${unverifiableReasonHint(inspection.reason)}. Set ${DATABASE_DIRECT_URL_ENV} explicitly.`
    );
  }

  return { url: fallbackUrl, port: inspection.port, source: "database_url_fallback" };
}

/**
 * One-line, credential-free description of a resolved session target, for boot
 * logs and warnings.
 */
export function describeSessionDatabaseTarget(target: SessionDatabaseTarget): string {
  return target.source === "direct_url_env"
    ? `${DATABASE_DIRECT_URL_ENV} (port ${target.port})`
    : `${DATABASE_URL_ENV} fallback (port ${target.port}, not pooled)`;
}
