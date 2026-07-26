import postgres from "postgres";
import type { Sql } from "postgres";

import {
  DATABASE_DIRECT_URL_ENV,
  DATABASE_URL_ENV,
  describeSessionDatabaseTarget,
  resolveSessionDatabaseTarget,
  type DatabaseEnvMap,
  type SessionDatabaseTarget,
} from "./connectionTargets";

/**
 * Single dedicated connection to the DIRECT database port, for the handful of
 * paths that need session-scoped semantics (see `connectionTargets.ts`).
 *
 * Deliberately lazy and short-lived:
 *   - lazy, because only startup migrations, the startup assistant-docs reindex
 *     and the backup scheduler ever need it. Opening a second pool at import
 *     time would burn one of Render's 10 reserved direct connections in every
 *     short-lived process — including the hundreds of smoke-harness bridge
 *     subprocesses, none of which take a session lock;
 *   - short-lived, because ending the session also drops every advisory lock it
 *     still holds, which turns a bug in the unlock path into a bounded leak
 *     instead of a permanent one. The callers run at boot or once a minute, so
 *     paying one connect (~0.5 s) per call is negligible.
 */
export type SessionDatabaseClient = Sql;

/** The only capability this module needs from a driver client. */
export type ClosableDatabaseClient = {
  end: () => Promise<void>;
};

export type SessionDatabaseLogger = Pick<Console, "log">;

export type SessionDatabaseConnect<TClient extends ClosableDatabaseClient = SessionDatabaseClient> =
  (target: SessionDatabaseTarget) => TClient;

export type SessionDatabaseOptions = {
  env?: DatabaseEnvMap;
  logger?: SessionDatabaseLogger;
};

export type WithSessionDatabaseClientOptions = SessionDatabaseOptions & {
  /** Injectable for tests; defaults to a `max: 1` postgres.js client. */
  connect?: SessionDatabaseConnect;
};

const defaultConnect: SessionDatabaseConnect = (target) => postgres(target.url, { max: 1 });

const warnedPurposes = new Set<string>();

/** Exported for tests: the fallback notice is logged once per purpose per process. */
export function resetSessionDatabaseWarnings(): void {
  warnedPurposes.clear();
}

function warnOnFallbackOnce(
  purpose: string,
  target: SessionDatabaseTarget,
  logger: SessionDatabaseLogger
): void {
  if (target.source !== "database_url_fallback" || warnedPurposes.has(purpose)) return;
  warnedPurposes.add(purpose);
  logger.log(
    `[db] ${DATABASE_DIRECT_URL_ENV} is not set; ${purpose} is using ` +
      `${describeSessionDatabaseTarget(target)}. Set ${DATABASE_DIRECT_URL_ENV} before pointing ` +
      `${DATABASE_URL_ENV} at a transaction pooler.`
  );
}

/**
 * Resolve the session target, open a client through `connect`, run `action`, and
 * close the client. Throws before connecting when the resolved target would
 * route a session lock through the transaction pooler.
 *
 * Generic over the client so callers (and tests) can supply anything closable;
 * `withSessionDatabaseClient` is the postgres.js instantiation.
 *
 * @param purpose short identifier of the calling path, surfaced in errors.
 */
export async function withResolvedSessionClient<TClient extends ClosableDatabaseClient, T>(
  purpose: string,
  connect: SessionDatabaseConnect<TClient>,
  action: (client: TClient) => Promise<T>,
  options: SessionDatabaseOptions = {}
): Promise<T> {
  const target = resolveSessionDatabaseTarget(purpose, options.env ?? process.env);
  warnOnFallbackOnce(purpose, target, options.logger ?? console);

  const client = connect(target);
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

/**
 * Run `action` against a freshly opened DIRECT postgres.js connection, closing it
 * afterwards.
 */
export function withSessionDatabaseClient<T>(
  purpose: string,
  action: (client: SessionDatabaseClient) => Promise<T>,
  options: WithSessionDatabaseClientOptions = {}
): Promise<T> {
  return withResolvedSessionClient(purpose, options.connect ?? defaultConnect, action, options);
}
