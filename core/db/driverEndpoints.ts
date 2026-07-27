/**
 * Where postgres.js will actually dial — asked of postgres.js.
 *
 * `connectionTargets.ts` has to know one thing to do its job: the port the
 * driver will connect on for a given connection string, so it can refuse to take
 * a session-level advisory lock through a transaction pooler. It used to answer
 * that question by parsing the connection string itself. That model was wrong
 * twice in a row (first it ignored `PGPORT`, then it ignored `PGHOST`), and it
 * was wrong in the dangerous direction both times: it reported a VERIFIED direct
 * target while the driver dialled the pooler.
 *
 * The fix is not a third parsing rule. postgres.js resolves a connection to
 * `options.host[]` / `options.port[]` synchronously, at construction, before any
 * socket exists — so this module builds a throwaway client and reads the answer
 * off it. There is nothing left to keep in step with the driver: an upgrade that
 * changes the resolution rules changes this module's answers with it.
 *
 * ---------------------------------------------------------------------------
 * The resolution, as it is written in postgres.js 3.4.9 (`src/index.js`)
 * ---------------------------------------------------------------------------
 * `parseUrl(url)` (~l. 536), which reads the RAW string, not a `URL`:
 *   1. `host = url.slice(url.indexOf('://') + 3).split(/[?/]/)[0]`, then
 *      `decodeURIComponent(host.slice(host.indexOf('@') + 1))` — the authority,
 *      credentials stripped, percent-decoded;
 *   2. `new URL(url.replace(host, host.split(',')[0]))` — the URL object is
 *      built from a string REWRITTEN to the first host, so `URL` rejecting the
 *      original says nothing about whether the driver will connect;
 *   3. `multihost = host.indexOf(',') > -1 && host`.
 *
 * `parseOptions(a, b)` (~l. 428), where `env` is `process.env` read directly:
 *   4. `host = o.hostname || o.host || multihost || url.hostname || env.PGHOST || 'localhost'`;
 *   5. `port = o.port || url.port || env.PGPORT || 5432`;
 *   6. `host: host.split(',').map(x => x.split(':')[0])`;
 *   7. `port: host.split(',').map(x => parseInt(x.split(':')[1] || port))`.
 *
 * Line 7 is the one that keeps catching a hand-written guard out: the port array
 * is derived from the HOST string. A `:port` suffix carried by a host — from the
 * URL authority OR from `PGHOST` — beats the scalar port of line 5, and the
 * number of endpoints follows the host list, not the port. Line 4 is the other
 * half: `PGHOST` is consulted only when the URL carries no authority of its own,
 * so `postgres:///db` and `postgres://host/db` resolve their host from different
 * places.
 *
 * Consequences, each observed against the installed driver and pinned — against
 * the driver, not against this list — in
 * `tests/vitest/server/databaseDriverEndpoints.test.ts`:
 *
 *   `postgres:///coderso` + `PGHOST=pooler:6432`      -> ["pooler"],  [6432]
 *   `postgres:///coderso` + `PGHOST=pooler:6432` + `PGPORT=5432`
 *                                                     -> ["pooler"],  [6432]
 *   `postgres:///coderso` + `PGHOST=pooler`           -> ["pooler"],  [5432]
 *   `postgres:///coderso` + `PGHOST=/var/run/pg` + `PGPORT=6432`
 *                                                     -> ["/var/run/pg"], [6432]
 *   `postgres://h/db`     + `PGPORT=6432`             -> ["h"],       [6432]
 *   `postgres://h/db`     + `PGPORT=6432abc`          -> ["h"],       [6432]
 *   `postgres://u:p@direct:5432/db` + `PGHOST=pooler:6432`
 *                                                     -> ["direct"],  [5432]
 *   `postgres://u:p@a:5432,b:6432/db`                 -> ["a","b"],   [5432,6432]
 *   `postgres://u:p@a,b/db` + `PGPORT=6432`           -> ["a","b"],   [6432,6432]
 *   `postgres://u:p@a:5432,b/db` + `PGPORT=6432`      -> ["a","b"],   [5432,5432]
 *   `postgres://h/db`     + `PGPORT=not-a-port`       -> ["h"],       [NaN]
 *   `postgres://h:abc/db`                             -> throws (invalid URL)
 *
 * The last two are why `port` below is nullable and why a caller must treat
 * "the driver refused the string" as its own outcome.
 *
 * ---------------------------------------------------------------------------
 * Why building a client here is cheap and side-effect free
 * ---------------------------------------------------------------------------
 * `Postgres()` parses the options, allocates `max` `Connection` objects and a
 * subscribe sub-client, and returns. `Connection()` sets `socket = null` and
 * dials only from `connect(query)`; its timers are lazy `timer()` handles that
 * schedule nothing until started. A process that builds clients this way and
 * never queries reports no active resources and exits immediately. So this
 * module builds with `max: 1` and does not `end()` — `end()` is async and this
 * resolution has to stay synchronous, because `core/db/drizzle.config.ts`
 * resolves its target at module load.
 */

import postgres from "postgres";

/** Environment as a plain map, so callers can pass one that is not ambient. */
export type DatabaseEnvMap = Record<string, string | undefined>;

/** One host/port pair the driver is prepared to dial. */
export type DatabaseEndpoint = {
  /** Host as the driver will pass it to `socket.connect` — or a unix socket directory. */
  host: string;
  /**
   * Port as the driver will pass it, or null when the driver's resolution does
   * not yield a dialable TCP port (`parseInt` of a non-numeric `PGPORT` gives
   * `NaN`; a URL may name port 0).
   */
  port: number | null;
};

/**
 * What the driver resolved, or the fact that it refused the string.
 *
 * A discriminated union rather than an empty array, so "the driver would not
 * even parse this" cannot be misread as "this connects nowhere".
 */
export type DriverEndpointResolution =
  { resolved: true; endpoints: DatabaseEndpoint[] } | { resolved: false; endpoints: null };

/**
 * The variables postgres.js consults while resolving a host and a port (lines 4
 * and 5 above). They are the only ones this module has to project from a caller
 * -supplied env map onto `process.env`.
 *
 * That projection matters ONLY for callers that pass a map which is not
 * `process.env` — tests, essentially. Production callers pass `process.env`
 * itself, so the driver reads exactly the environment it will read again when it
 * connects, and a future driver version that consults some further variable is
 * honoured automatically rather than silently missed.
 */
const DRIVER_ENDPOINT_ENV_VARS = ["PGHOST", "PGPORT"] as const;

const setProcessEnv = (name: string, value: string | undefined): void => {
  // Assigning `undefined` to `process.env` stores the STRING "undefined", which
  // the driver would then treat as a host name. Unset means delete.
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

/**
 * Run `read` with `DRIVER_ENDPOINT_ENV_VARS` taken from `env`, then put
 * `process.env` back exactly as it was.
 *
 * Safe because `read` is synchronous: nothing else can run — let alone connect —
 * while the environment is swapped, and the restore is in a `finally`. When
 * `env` IS `process.env` every write stores the value that was already there.
 */
const withDriverEnv = <T>(env: DatabaseEnvMap, read: () => T): T => {
  const previous = DRIVER_ENDPOINT_ENV_VARS.map((name) => [name, process.env[name]] as const);
  for (const name of DRIVER_ENDPOINT_ENV_VARS) {
    setProcessEnv(name, env[name]);
  }

  try {
    return read();
  } finally {
    for (const [name, value] of previous) {
      setProcessEnv(name, value);
    }
  }
};

/** Lowest dialable TCP port. Port 0 asks the OS to pick one, so it is not dialable. */
export const MIN_TCP_PORT = 1;

/** Highest dialable TCP port. */
export const MAX_TCP_PORT = 65535;

const toEndpoints = (hosts: string[], ports: number[]): DatabaseEndpoint[] =>
  hosts.map((host, index) => {
    const port = ports[index];
    const dialable =
      typeof port === "number" &&
      Number.isInteger(port) &&
      port >= MIN_TCP_PORT &&
      port <= MAX_TCP_PORT;
    return { host, port: dialable ? port : null };
  });

/**
 * Resolve every endpoint postgres.js would dial for `url` under `env`, without
 * connecting and without reading or returning the credentials in the string.
 *
 * `resolved: false` means the driver rejected the string outright (it throws
 * from `new URL` for an unparsable one), which callers must treat as "unknown",
 * never as "fine".
 */
export function resolveDriverEndpoints(
  url: string,
  env: DatabaseEnvMap = process.env
): DriverEndpointResolution {
  return withDriverEnv(env, () => {
    try {
      // `max: 1` keeps the throwaway allocation to one Connection. No host, port
      // or path option is passed: those would take precedence over the string
      // and the env (lines 4 and 5), and no caller in this repo passes them.
      const client = postgres(url, { max: 1 });
      return {
        resolved: true,
        endpoints: toEndpoints(client.options.host, client.options.port),
      };
    } catch {
      return { resolved: false, endpoints: null };
    }
  });
}
