/**
 * Where postgres.js will actually dial — asked of postgres.js, and asked about
 * every field that decides it.
 *
 * `connectionTargets.ts` has to know one thing to do its job: the endpoint the
 * driver connects to for a given connection string, so it can refuse to take a
 * session-level advisory lock through a transaction pooler. It used to answer
 * that by parsing the connection string itself, and was wrong in the FAIL-OPEN
 * direction twice: first it ignored `PGPORT`, then it ignored a host-specific
 * port in `PGHOST`. It then started asking the driver instead — but only for
 * `options.host` and `options.port`, which is two of the three fields the
 * driver's `connect()` consults, and it failed open a third time:
 *
 *   postgres:///coderso  +  PGHOST=/var/run/pgbouncer:5432  PGPORT=6432
 *     options.host / options.port -> ["/var/run/pgbouncer"], [5432]
 *     options.path                -> "/var/run/pgbouncer:5432/.s.PGSQL.6432"
 *
 *   The guard read the first line and cleared the target as direct on port 5432.
 *   The driver reads the second and dials the POOLER's socket.
 *
 * Every one of those three bugs was the same bug: the guard decided WHICH of the
 * driver's facts describes the connection. So this module stops deciding. It
 * enumerates the driver's whole dial surface below, reports which case the driver
 * landed in, and REFUSES BY DEFAULT — a shape it has not audited comes back
 * `unrecognized`, never as "TCP on port N".
 *
 * ---------------------------------------------------------------------------
 * THE DIAL SURFACE: every field postgres.js 3.4.9 consults to choose an
 * endpoint, in the driver's own precedence order (`src/connection.js`)
 * ---------------------------------------------------------------------------
 *   1. `options.socket` — `createSocket()` (l. 131) builds the transport with
 *      `await options.socket(options)` instead of `new net.Socket()`, and
 *      `connect()` (l. 344) then RETURNS before any `socket.connect(...)` call:
 *      host, port and path are all unused, and where the connection lands is the
 *      factory's business, not something this module can read. Settable only
 *      through the options object (`o.socket`, `src/index.js` l. 495) — never
 *      from a connection string or from the environment.
 *   2. `options.path` — `connect()` l. 350: `if (options.path) return
 *      socket.connect(options.path)`. A unix-domain socket; host and port are
 *      never read. The driver's test is TRUTHINESS, so `false`, `""` and
 *      `undefined` all mean "not a socket dial".
 *   3. `options.port[hostIndex]` and `options.host[hostIndex]` — `connect()`
 *      l. 354, reached only when 1 and 2 are both absent. `hostIndex` advances
 *      modulo `port.length` after every attempt (l. 358) and `error()` keeps
 *      going while `options.host[retries + 1]` exists (l. 382), so when there is
 *      more than one entry the connection can land on any of them.
 *
 * `Connection()` destructures `host` and `port` out of the options once (l. 53)
 * and `connect()` reads nothing else about the endpoint. `options.ssl` and
 * `options.sslnegotiation` decide how to negotiate ON that socket, not where it
 * goes.
 *
 * ---------------------------------------------------------------------------
 * How `parseOptions` (`src/index.js` l. 428) fills those fields
 * ---------------------------------------------------------------------------
 * `env` is bound to `process.env` directly (l. 434), and `parseUrl` (l. 536)
 * reads the RAW string rather than a `URL`: the authority with credentials
 * stripped and percent-decoded, plus `multihost`, which is that authority when it
 * contains a comma. The `URL` object is built from the string REWRITTEN to the
 * first host, so `URL` rejecting the original says nothing about whether the
 * driver will connect.
 *
 *   l. 438  host = o.hostname || o.host || multihost || url.hostname || env.PGHOST || 'localhost'
 *   l. 439  port = o.port || url.port || env.PGPORT || 5432
 *   l. 466  host : Array.isArray(host) ? host : host.split(',').map(x => x.split(':')[0])
 *   l. 467  port : Array.isArray(port) ? port : host.split(',').map(x => parseInt(x.split(':')[1] || port))
 *   l. 468  path : o.path || host.indexOf('/') > -1 && host + '/.s.PGSQL.' + port
 *   l. 495  socket : o.socket
 *
 * The consequences this guard kept getting wrong:
 *   - l. 467 builds the port array out of the HOST string, so a `:port` suffix
 *     carried by a host — from the URL authority OR from `PGHOST` — beats the
 *     scalar port of l. 439, and the NUMBER of endpoints follows the host list;
 *   - l. 468 switches the dial to a unix socket as soon as the host string
 *     contains a slash, and it names that socket from the SCALAR port of l. 439,
 *     NOT from the per-host array of l. 467. The two can disagree, and when they
 *     do the array is the wrong answer;
 *   - l. 438 consults `PGHOST` only when the connection string carries no
 *     authority of its own, so `postgres:///db` and `postgres://host/db` take
 *     their host from different places.
 *
 * Each of those is pinned against the installed driver — against the driver, not
 * against this comment — in `tests/vitest/server/databaseDriverEndpoints.test.ts`.
 *
 * ---------------------------------------------------------------------------
 * Why refusal is the default, and how a driver change trips it
 * ---------------------------------------------------------------------------
 * Only case 3, with exactly one endpoint, answers the caller's question ("which
 * port will this session land on"). Cases 1 and 2 come back as their own kinds
 * and the caller refuses them: a socket path has no TCP port to compare against
 * the pooler's, and a caller-supplied transport has no endpoint to read at all.
 * Refusing a DIRECT unix socket is the wrong answer in the safe direction, and
 * the remedy is always available — point `DATABASE_DIRECT_URL` at the TCP port.
 *
 * A fourth field would be a fourth way to fail open, so classification begins by
 * auditing the driver's option surface against `AUDITED_DRIVER_OPTION_KEYS`: the
 * exact key set postgres.js 3.4.9 returns from `parseOptions` for
 * `postgres(url, { max: 1 })`. Any key added, removed or re-shaped makes this
 * module answer `unrecognized`, which every caller must treat as unverifiable.
 * So the next driver change surfaces as an over-refusal at boot, with the drift
 * named, instead of as another silent hole. A connection string cannot move that
 * key set: URL query parameters that are not driver defaults are collected into
 * `options.connection` (l. 484) rather than added at the top level.
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
import type { Sql } from "postgres";

/** Environment as a plain map, so callers can pass one that is not ambient. */
export type DatabaseEnvMap = Record<string, string | undefined>;

/** One host/port pair the driver is prepared to dial. */
export type DatabaseEndpoint = {
  /** Host as the driver will pass it to `socket.connect`. */
  host: string;
  /**
   * Port as the driver will pass it, or null when the driver's resolution does
   * not yield a dialable TCP port (`parseInt` of a non-numeric `PGPORT` gives
   * `NaN`; a URL may name port 0).
   */
  port: number | null;
};

/**
 * What the driver will do with the connection string — one case per branch of
 * its `connect()`, plus the two "no answer" outcomes.
 *
 * A discriminated union rather than an endpoint list with holes in it, so no
 * caller can read a TCP port off a dial that is not a TCP dial.
 */
export type DriverDial =
  /** `socket.connect(port[i], host[i])`: the only case that names a TCP port. */
  | { kind: "tcp"; endpoints: DatabaseEndpoint[] }
  /** `socket.connect(options.path)`: a unix-domain socket, no TCP port. */
  | { kind: "unix_socket"; path: string }
  /** `options.socket` supplies the transport; the driver dials nothing itself. */
  | { kind: "custom_transport" }
  /**
   * The driver refused to build a client at all — for the connection string, or
   * for the environment it would resolve it with — so there is no endpoint.
   */
  | { kind: "refused_url" }
  /** The driver's option surface is not the audited one; nothing may be read off it. */
  | { kind: "unrecognized"; detail: string };

/** The options postgres.js exposes on a built client, as the driver types them. */
type DriverOptions = Sql["options"];

/**
 * `Object.keys()` of the options postgres.js 3.4.9 returns for
 * `postgres(url, { max: 1 })`, sorted. Measured against the installed driver
 * under both runtimes this repository uses (node and bun resolve the same
 * `src/index.js`), and re-measured on every run of the driver-endpoint lane.
 *
 * This is the tripwire that makes an unaudited driver over-refuse: a version that
 * adds, removes or renames ANY option — endpoint-deciding or not — no longer
 * matches, so `classifyDriverDial` answers `unrecognized` until someone re-reads
 * `connect()` and updates the dial surface documented above.
 */
export const AUDITED_DRIVER_OPTION_KEYS: readonly string[] = Object.freeze([
  "backoff",
  "connect_timeout",
  "connection",
  "database",
  "debug",
  "fetch_types",
  "host",
  "idle_timeout",
  "keep_alive",
  "max",
  "max_lifetime",
  "max_pipeline",
  "onclose",
  "onnotice",
  "onnotify",
  "onparameter",
  "parameters",
  "parsers",
  "pass",
  "path",
  "port",
  "prepare",
  "publications",
  "serializers",
  "shared",
  "socket",
  "ssl",
  "sslnegotiation",
  "target_session_attrs",
  "transform",
  "types",
  "user",
]);

/**
 * The prefix that defines which environment variables belong to the driver.
 *
 * The projection below hands the driver the caller's variables under this prefix —
 * ALL of them, not a hand-picked list of the ones that decide an endpoint.
 * Deciding which of the driver's inputs matter is the judgement that made this
 * guard fail open three times, and the hand-picked list (`PGHOST`, `PGPORT`) was
 * already incomplete: `PGTARGETSESSIONATTRS` does not move the endpoint, but an
 * unsupported value makes `tsa()` (`src/index.js` l. 504) THROW, so a caller whose
 * map set it was handed a verified target by a driver that refuses to build a
 * client for that environment at all.
 *
 * `PG` is the driver's own boundary rather than ours. Every environment read in
 * postgres.js 3.4.9 goes through the `env` bound at l. 434, and every one of them
 * is `PG`-prefixed: `PGHOST`, `PGPORT` (l. 438/439), `PGUSERNAME`, `PGUSER`
 * (l. 440), `PGDATABASE` (l. 469), `PGPASSWORD` (l. 471), `PGAPPNAME` (l. 485),
 * `PGTARGETSESSIONATTRS` (l. 504) and `env['PG' + option.toUpperCase()]` for every
 * defaulted option (l. 477). The only reads that are not `PG*` are in
 * `osUsername()` (l. 561) — `process.env.LOGNAME`, `USER`, `USERNAME` — which feed
 * the default user and through it the default database name, never the endpoint,
 * and which cannot throw. They stay ambient deliberately: projecting them would let
 * a caller-supplied map change which OS user a real connection authenticates as.
 */
const DRIVER_ENV_PREFIX = "PG";

const driverEnvNames = (env: DatabaseEnvMap): string[] =>
  Object.keys(env).filter((name) => name.startsWith(DRIVER_ENV_PREFIX));

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
 * Run `read` with the driver's whole environment namespace taken from `env`, then
 * put `process.env` back exactly as it was.
 *
 * Safe because `read` is synchronous: nothing else can run — let alone connect —
 * while the environment is swapped, and the restore is in a `finally`. When
 * `env` IS `process.env` every write stores the value that was already there,
 * which is every production caller.
 */
const withDriverEnv = <T>(env: DatabaseEnvMap, read: () => T): T => {
  // The union of both sides: names the caller supplies have to be set, and names
  // only the ambient environment has must be UNSET, or the driver would resolve
  // against a mixture of the two.
  const names = [...new Set([...driverEnvNames(process.env), ...driverEnvNames(env)])];
  const previous = names.map((name) => [name, process.env[name]] as const);
  for (const name of names) {
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

const formatKeyList = (keys: readonly string[]): string =>
  keys.length === 0 ? "none" : keys.join(", ");

/**
 * Everything about the resolved options that has to hold before any field of them
 * may be read as an endpoint, or a description of the first thing that does not.
 *
 * The key-set comparison comes first because it is the only check that can notice
 * a field this module has never heard of.
 */
const dialSurfaceDrift = (options: DriverOptions): string | null => {
  const keys = Object.keys(options).sort();
  const unexpected = keys.filter((key) => !AUDITED_DRIVER_OPTION_KEYS.includes(key));
  const missing = AUDITED_DRIVER_OPTION_KEYS.filter((key) => !keys.includes(key));
  if (unexpected.length > 0 || missing.length > 0) {
    return (
      `the driver's parsed options are not the audited surface (unexpected: ` +
      `${formatKeyList(unexpected)}; missing: ${formatKeyList(missing)})`
    );
  }

  if (!Array.isArray(options.host) || options.host.some((host) => typeof host !== "string")) {
    return "options.host is not an array of host strings";
  }
  if (!Array.isArray(options.port) || options.port.some((port) => typeof port !== "number")) {
    return "options.port is not an array of numbers";
  }
  if (options.host.length === 0 || options.host.length !== options.port.length) {
    return (
      `options.host and options.port do not pair up (${options.host.length} hosts, ` +
      `${options.port.length} ports)`
    );
  }
  return null;
};

/**
 * Which dial the driver's own `connect()` would make with these options.
 *
 * Exported so the guard's test can hold this classification against a driver
 * whose options have been perturbed — the audit is only worth having if it is
 * shown to refuse.
 *
 * The branch order IS the driver's precedence (see the dial surface above), and
 * the final `unrecognized` is the default: reaching the TCP case requires every
 * preceding check to have passed.
 */
export function classifyDriverDial(options: DriverOptions): DriverDial {
  const drift = dialSurfaceDrift(options);
  if (drift !== null) return { kind: "unrecognized", detail: drift };

  // `socket` is in the audited key set, so it is always present; what matters is
  // whether the caller supplied a transport factory. Read through `in` because
  // the driver's own types do not declare the field it nevertheless returns.
  if ("socket" in options && options.socket !== undefined) return { kind: "custom_transport" };

  // Truthiness, exactly as `connect()` l. 350 tests it: the driver returns
  // `false` here for a host with no slash in it, and the declared type says
  // `string | undefined`, so neither a type check nor `!= null` would do.
  if (options.path) return { kind: "unix_socket", path: String(options.path) };

  return { kind: "tcp", endpoints: toEndpoints(options.host, options.port) };
}

/**
 * Resolve what postgres.js would dial for `url` under `env`, without connecting
 * and without reading or returning the credentials in the string.
 *
 * `refused_url` means the driver rejected the string outright (it throws from
 * `new URL` for an unparsable one, and from `tsa()` for an unsupported
 * `target_session_attrs`), which callers must treat as "unknown", never as
 * "fine".
 */
export function resolveDriverDial(url: string, env: DatabaseEnvMap = process.env): DriverDial {
  return withDriverEnv(env, () => {
    let client: Sql;
    try {
      // `max: 1` keeps the throwaway allocation to one Connection. No host, port,
      // path or socket option is passed: each of those would take precedence over
      // the string and the environment (see the dial surface above), and no caller
      // in this repository passes them.
      client = postgres(url, { max: 1 });
    } catch {
      // Only construction is guarded. A throw out of the classification is a bug
      // in this module, not an unparsable URL, and must not be reported as one.
      return { kind: "refused_url" };
    }
    return classifyDriverDial(client.options);
  });
}
