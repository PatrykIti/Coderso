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
 * accepted when the endpoint the driver will connect to can be read AND is not
 * the pooler. "Could not read it" is never treated as "not the pooler".
 *
 * WHERE the driver will connect is not inferred here, and it is not read out of
 * one chosen field of the driver's answer either. `./driverEndpoints.ts`
 * enumerates every field postgres.js consults to pick an endpoint, classifies
 * which of those dials the driver would make, and refuses by default. Both
 * shortcuts have already failed OPEN in this guard: re-deriving the port from the
 * connection string cleared a portless URL as "port 5432, direct" while first
 * `PGPORT` and later a host-specific `PGHOST=pooler:6432` sent the driver to the
 * pooler, and reading only the driver's `options.host` / `options.port` cleared a
 * `PGHOST` containing a slash as direct while the driver dialled the pooler's
 * unix socket named by `options.path`.
 *
 * The policy this module adds on top of the driver's answer is deliberately
 * narrow:
 *   - the dial must be a TCP dial. A unix-domain socket has no TCP port to
 *     compare with the pooler's, and a caller-supplied transport has no endpoint
 *     to read at all, so neither can be certified — including when it happens to
 *     be direct. That over-refusal is the safe direction and it always has a
 *     remedy: name the direct TCP port in `DATABASE_DIRECT_URL`;
 *   - there must be exactly ONE endpoint. A comma-separated host list — in the
 *     URL or in `PGHOST` — is libpq failover syntax that postgres.js rotates
 *     through, and it can name the direct port and the pooler port at the same
 *     time, so no single port describes where a session lands;
 *   - that endpoint's port must be dialable (the driver yields `NaN` for a
 *     non-numeric `PGPORT`, and a URL may name port 0);
 *   - that port must not be the pooler's.
 *
 * Importing this module still opens no connection, so it stays safe at module
 * load — `core/db/drizzle.config.ts` resolves its target there.
 */

import {
  MAX_TCP_PORT,
  MIN_TCP_PORT,
  resolveDriverDial,
  type DatabaseEnvMap,
} from "./driverEndpoints";

export type { DatabaseEnvMap };

export const DATABASE_URL_ENV = "DATABASE_URL";
export const DATABASE_DIRECT_URL_ENV = "DATABASE_DIRECT_URL";
export const DATABASE_POOLED_PORT_ENV = "DATABASE_POOLED_PORT";
export const DATABASE_POOL_MAX_ENV = "DB_POOL_MAX";

/** The bounded per-process pool contract shared with the database client. */
export const DEFAULT_DATABASE_POOL_MAX = 10;
export const MIN_DATABASE_POOL_MAX = 1;
export const MAX_DATABASE_POOL_MAX = 50;

/** PgBouncer's port on Render. Overridable via `DATABASE_POOLED_PORT`. */
export const DEFAULT_POOLED_DATABASE_PORT = 6432;

/** postgres.js connects on 5432 when neither the string nor `PGPORT` names a port. */
export const DEFAULT_POSTGRES_PORT = 5432;

/**
 * Why a connection string could not be resolved to one known port. One per way
 * the driver's own answer fails to name a single dialable TCP endpoint — not a
 * list of parsing rules of our own.
 */
export type DatabaseUrlUnverifiableReason =
  /**
   * The driver refuses to build a client for it at all — for the string itself, or
   * for the `PG*` environment it would resolve it with — so there is no endpoint.
   */
  | "unparsable_url"
  /**
   * The driver resolves several endpoints and fails over between them, so no
   * single port describes where the connection lands.
   */
  | "multiple_hosts"
  /** The driver resolves one endpoint whose port is not a dialable TCP port. */
  | "invalid_port"
  /** The driver dials a unix-domain socket, which carries no TCP port to compare. */
  | "unix_socket_dial"
  /** The connection is made by a caller-supplied transport, so it has no endpoint. */
  | "custom_transport_dial"
  /** The driver's option surface is not the one this repository audited. */
  | "unrecognized_driver_dial";

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

const invalidDatabasePoolMax = (): Error =>
  new Error(
    `database_pool_max_invalid: ${DATABASE_POOL_MAX_ENV} must be a decimal integer between ` +
      `${MIN_DATABASE_POOL_MAX} and ${MAX_DATABASE_POOL_MAX}.`
  );

/**
 * Resolve the per-process pool limit without importing or opening the database
 * client. An explicitly configured value is strict: postgres.js must never see
 * a partial `parseInt` result, an unsafe integer, or an unbounded socket count.
 */
export function resolveDatabasePoolMax(env: DatabaseEnvMap = process.env): number {
  const configured = env[DATABASE_POOL_MAX_ENV];
  if (configured === undefined) return DEFAULT_DATABASE_POOL_MAX;

  if (!/^[0-9]+$/u.test(configured)) {
    throw invalidDatabasePoolMax();
  }

  const parsed = Number(configured);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < MIN_DATABASE_POOL_MAX ||
    parsed > MAX_DATABASE_POOL_MAX
  ) {
    throw invalidDatabasePoolMax();
  }

  return parsed;
}

/**
 * Resolve the port PgBouncer is expected on. Misconfiguring this would silently
 * disable the session-lock guard, so an unusable value is a hard error.
 */
export function resolvePooledDatabasePort(env: DatabaseEnvMap = process.env): number {
  const configured = normalizeOptionalString(env[DATABASE_POOLED_PORT_ENV]);
  if (!configured) return DEFAULT_POOLED_DATABASE_PORT;

  const parsed = Number(configured);
  if (!Number.isInteger(parsed) || parsed < MIN_TCP_PORT || parsed > MAX_TCP_PORT) {
    throw new Error(
      `database_pooled_port_invalid: ${DATABASE_POOLED_PORT_ENV} must be an integer port ` +
        `between ${MIN_TCP_PORT} and ${MAX_TCP_PORT} (got ${JSON.stringify(configured)}).`
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
 * Inspect a connection string without connecting. Never returns or logs the
 * credentials it was given.
 *
 * Fails closed: anything the DRIVER does not resolve to a single dialable TCP
 * port comes back `verified: false`, which callers must treat as "might be the
 * pooler". Every dial the driver can make that is not one TCP endpoint has its
 * own reason, so no unread dial can pass as a read one.
 */
export function inspectDatabaseUrl(
  url: string,
  pooledPort: number,
  env: DatabaseEnvMap = process.env
): DatabaseUrlInspection {
  const dial = resolveDriverDial(url, env);
  if (dial.kind === "refused_url") return unverifiable("unparsable_url");
  if (dial.kind === "unrecognized") return unverifiable("unrecognized_driver_dial");
  if (dial.kind === "custom_transport") return unverifiable("custom_transport_dial");
  if (dial.kind === "unix_socket") return unverifiable("unix_socket_dial");

  const { endpoints } = dial;
  if (endpoints.length > 1) return unverifiable("multiple_hosts");

  // The driver always yields at least one endpoint for a string it accepted
  // (`host.split(',')` cannot be empty); an empty list would mean the driver
  // changed shape under us, which is exactly when to refuse rather than guess.
  const endpoint = endpoints[0];
  if (!endpoint || endpoint.port === null) return unverifiable("invalid_port");

  return { verified: true, port: endpoint.port, pooled: endpoint.port === pooledPort };
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
      "the driver resolves it to several comma-separated hosts, which it fails over between, " +
      "so no single port describes where the connection lands (such a list — in the URL or in " +
      "PGHOST — can name the direct port and the pooler port at once)"
    );
  }
  if (reason === "invalid_port") {
    return (
      "the port the driver resolves for it — from the connection string, from a host-specific " +
      `suffix in PGHOST, or from PGPORT — is not a port number between 1 and ${MAX_TCP_PORT}`
    );
  }
  if (reason === "unix_socket_dial") {
    return (
      "the driver dials a unix-domain socket for it rather than a TCP port, because the host " +
      "it resolves — from the connection string or from PGHOST — contains a slash; the socket " +
      "it names carries the port from PGPORT, which need not be the port the same host " +
      "resolves to, so nothing here can be compared with the pooler's port"
    );
  }
  if (reason === "custom_transport_dial") {
    return (
      "the connection is made by a caller-supplied socket factory, so the driver dials no " +
      "endpoint of its own and there is no port to compare with the pooler's"
    );
  }
  if (reason === "unrecognized_driver_dial") {
    return (
      "the installed postgres.js returns parsed options that are not the surface this " +
      "repository audited — most likely the driver was upgraded, in which case its connect() " +
      "must be re-read and the dial surface documented in core/db/driverEndpoints.ts updated " +
      "before any endpoint may be read out of it again"
    );
  }
  return (
    "the driver refuses to build a client for it — either it does not parse as a connection " +
    "string, or the PG* environment it would be resolved with is one the driver rejects — so " +
    "its port cannot be read"
  );
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
