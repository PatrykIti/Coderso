import postgres from "postgres";
import type { Sql } from "postgres";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  DATABASE_DIRECT_URL_ENV,
  DATABASE_URL_ENV,
  inspectDatabaseUrl,
  resolveSessionDatabaseTarget,
  type DatabaseEnvMap,
  type DatabaseUrlInspection,
  type DatabaseUrlUnverifiableReason,
} from "../../../core/db/connectionTargets";
import {
  AUDITED_DRIVER_OPTION_KEYS,
  classifyDriverDial,
  resolveDriverDial,
  type DriverDial,
} from "../../../core/db/driverEndpoints";
import { createSessionDatabaseClient } from "../../../core/db/sessionClient";
import {
  CONNECTION_BUDGET_MAX,
  DEFAULT_WORKER_POOL_MAX,
  MAX_WORKER_POOL_MAX,
  assertDirectUrl,
  buildWorkerDatabaseUrl,
  resolveWorkerEnv,
  resolveWorkerPoolMax,
  workerSchemaName,
} from "../../../scripts/bun-lane-worker-url";

/**
 * The pooler-port guard is only worth anything if its model of "where will the
 * driver connect?" is the DRIVER's answer. Three times it was not: it ignored
 * `PGPORT`, then it ignored a host-specific port in `PGHOST`, and then it read
 * `options.host` / `options.port` while the driver dialled the unix socket named
 * by `options.path`. Every time it reported a VERIFIED direct target while
 * postgres.js dialled the pooler.
 *
 * So this file never asserts the guard against a hand-written parse, and it never
 * asks the driver about one field. For every shape it builds its own client — which
 * parses options and opens no socket — reduces the resolved options to the dial
 * `connect()` would make, in `connect()`'s own precedence, and holds the guard to
 * that. A driver upgrade that moves the resolution therefore turns this lane red
 * instead of silently reopening the hole.
 *
 * The driver's variables are spelled out as literals rather than imported: the
 * contract under test belongs to libpq and postgres.js, not to a constant the
 * guard could rename in step with its test.
 */
const ENV_VARS_THIS_FILE_WRITES = ["PGHOST", "PGPORT", "PGTARGETSESSIONATTRS"] as const;

const POOLED_PORT = 6432;

/** The reported shape: a URL with no authority, so the driver falls back to `PGHOST`. */
const AUTHORITYLESS_URL = "postgres:///coderso";
const PORTLESS_URL = "postgres://coderso:secret@db.example.com/coderso";

const setEnvVar = (name: string, value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

/**
 * Run `read` with the driver's whole `PG*` namespace taken from `env`: the names
 * the map supplies are set, and the ambient names it does not supply are unset, so
 * the driver sees the caller's environment and not a mixture.
 *
 * Deliberately a second, independent copy of what `driverEndpoints.ts` does: a
 * test that reused the module's own projection could not catch that projection
 * being wrong — and it was wrong, projecting only `PGHOST` and `PGPORT` while the
 * driver also refuses an environment outright over `PGTARGETSESSIONATTRS`.
 */
const withStubbedDriverEnv = <T>(env: DatabaseEnvMap, read: () => T): T => {
  const names = [
    ...new Set(
      [...Object.keys(process.env), ...Object.keys(env)].filter((name) => name.startsWith("PG"))
    ),
  ];
  const previous = names.map((name) => [name, process.env[name]] as const);
  for (const name of names) {
    setEnvVar(name, env[name]);
  }
  try {
    return read();
  } finally {
    for (const [name, value] of previous) {
      setEnvVar(name, value);
    }
  }
};

/**
 * The dial postgres.js would make, as this test reads it off the driver.
 *
 * One case per branch of `src/connection.js`'s `connect()`, which is the only
 * place an endpoint is chosen.
 */
type DriverAnswer =
  | { dial: "refused" }
  | { dial: "custom" }
  | { dial: "unix"; path: string }
  | { dial: "tcp"; hosts: string[]; ports: number[] };

/**
 * Ask the installed driver where it would connect. Building a client allocates
 * one lazy `Connection` and dials nothing, so nothing here needs closing.
 *
 * The reduction below is `connect()`'s precedence and nothing else: `options.socket`
 * makes it return at l. 345 before any dial, a truthy `options.path` is dialled at
 * l. 350 instead of host/port, and only then does l. 354 use `port[i]`/`host[i]`.
 */
const askDriver = (url: string, env: DatabaseEnvMap): DriverAnswer =>
  withStubbedDriverEnv(env, () => {
    let options: Sql["options"];
    try {
      options = postgres(url, { max: 1 }).options;
    } catch {
      return { dial: "refused" };
    }
    if ("socket" in options && options.socket !== undefined) return { dial: "custom" };
    if (options.path) return { dial: "unix", path: String(options.path) };
    return { dial: "tcp", hosts: [...options.host], ports: [...options.port] };
  });

const unverifiable = (reason: DatabaseUrlUnverifiableReason): DatabaseUrlInspection => ({
  verified: false,
  port: null,
  pooled: false,
  reason,
});

const dialable = (port: number | undefined): port is number =>
  port !== undefined && Number.isInteger(port) && port >= 1 && port <= 65535;

/**
 * The verdict the guard MUST reach for a given driver answer, expressed once: a
 * TCP dial to exactly one endpoint whose port is dialable, and the pooler
 * comparison on that port. Everything else is unverifiable, including a dial the
 * driver makes perfectly well but that carries no TCP port to compare.
 *
 * Feeding it the driver's own answer is what makes the agreement test
 * non-circular — the dial comes from postgres.js, only the policy comes from here.
 */
const expectedInspection = (answer: DriverAnswer, pooledPort: number): DatabaseUrlInspection => {
  if (answer.dial === "refused") return unverifiable("unparsable_url");
  if (answer.dial === "custom") return unverifiable("custom_transport_dial");
  if (answer.dial === "unix") return unverifiable("unix_socket_dial");
  if (answer.hosts.length !== 1) return unverifiable("multiple_hosts");

  const port = answer.ports[0];
  if (!dialable(port)) return unverifiable("invalid_port");
  return { verified: true, port, pooled: port === pooledPort };
};

/** The same answer as `driverEndpoints.ts` is required to report it. */
const expectedDial = (answer: DriverAnswer): DriverDial => {
  if (answer.dial === "refused") return { kind: "refused_url" };
  if (answer.dial === "custom") return { kind: "custom_transport" };
  if (answer.dial === "unix") return { kind: "unix_socket", path: answer.path };
  return {
    kind: "tcp",
    endpoints: answer.hosts.map((host, index) => {
      const port = answer.ports[index];
      return { host, port: dialable(port) ? port : null };
    }),
  };
};

type EndpointCase = {
  name: string;
  url: string;
  env: DatabaseEnvMap;
  /** What postgres.js 3.4.9 dials, observed against the installed driver. */
  driver: DriverAnswer;
  /** What the guard must therefore report. */
  inspection: DatabaseUrlInspection;
};

/**
 * Each row is a shape of postgres.js's resolution, not a shape of a URL. The ones
 * that matter come from two driver rules:
 *   - the port array is built from the HOST string
 *     (`host.split(',').map(x => parseInt(x.split(':')[1] || port))`), so a
 *     `:port` suffix carried by a host beats the scalar port and the number of
 *     endpoints follows the host list;
 *   - `path` is set to `host + '/.s.PGSQL.' + port` whenever the host string
 *     contains a slash, from that SCALAR port, and a truthy `path` is the dial —
 *     host and port are then never read at all.
 */
const ENDPOINT_CASES: EndpointCase[] = [
  {
    name: "an explicit direct port",
    url: "postgres://coderso:secret@db.example.com:5432/coderso",
    env: {},
    driver: { dial: "tcp", hosts: ["db.example.com"], ports: [5432] },
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "PGHOST carrying the pooler port, for a url with no authority",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "pgbouncer.internal:6432" },
    driver: { dial: "tcp", hosts: ["pgbouncer.internal"], ports: [6432] },
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "a host-specific PGHOST port beating PGPORT",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "pgbouncer.internal:6432", PGPORT: "5432" },
    driver: { dial: "tcp", hosts: ["pgbouncer.internal"], ports: [6432] },
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "PGHOST without a port suffix",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "pgbouncer.internal" },
    driver: { dial: "tcp", hosts: ["pgbouncer.internal"], ports: [5432] },
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "a url authority beating PGHOST entirely",
    url: "postgres://coderso:secret@direct.example.com:5432/coderso",
    env: { PGHOST: "pgbouncer.internal:6432" },
    driver: { dial: "tcp", hosts: ["direct.example.com"], ports: [5432] },
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "no host anywhere",
    url: AUTHORITYLESS_URL,
    env: {},
    driver: { dial: "tcp", hosts: ["localhost"], ports: [5432] },
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "a comma-separated PGHOST that reaches the pooler on failover",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "direct.example.com:5432,pgbouncer.internal:6432" },
    driver: {
      dial: "tcp",
      hosts: ["direct.example.com", "pgbouncer.internal"],
      ports: [5432, 6432],
    },
    inspection: { verified: false, port: null, pooled: false, reason: "multiple_hosts" },
  },
  {
    name: "a comma-separated PGHOST with no port suffixes",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "direct.example.com,standby.example.com" },
    driver: {
      dial: "tcp",
      hosts: ["direct.example.com", "standby.example.com"],
      ports: [5432, 5432],
    },
    inspection: { verified: false, port: null, pooled: false, reason: "multiple_hosts" },
  },
  {
    name: "a comma-separated host list in the url",
    url: "postgres://coderso:secret@direct.example.com:5432,pgbouncer.internal:6432/coderso",
    env: {},
    driver: {
      dial: "tcp",
      hosts: ["direct.example.com", "pgbouncer.internal"],
      ports: [5432, 6432],
    },
    inspection: { verified: false, port: null, pooled: false, reason: "multiple_hosts" },
  },
  {
    name: "PGPORT for a url that omits the port",
    url: PORTLESS_URL,
    env: { PGPORT: "6432" },
    driver: { dial: "tcp", hosts: ["db.example.com"], ports: [6432] },
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "a PGPORT the driver parseInt()s down to the pooler port",
    url: PORTLESS_URL,
    env: { PGPORT: "6432abc" },
    driver: { dial: "tcp", hosts: ["db.example.com"], ports: [6432] },
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "a PGPORT that is not a number at all",
    url: PORTLESS_URL,
    env: { PGPORT: "not-a-port" },
    driver: { dial: "tcp", hosts: ["db.example.com"], ports: [Number.NaN] },
    inspection: { verified: false, port: null, pooled: false, reason: "invalid_port" },
  },
  {
    // `parseInt` yields a perfectly good NUMBER here, one past the top of the TCP
    // range, so nothing but the upper bound stops it being compared with the
    // pooler's port as though the driver could dial it.
    name: "a PGPORT one past the top of the TCP range",
    url: PORTLESS_URL,
    env: { PGPORT: "65536" },
    driver: { dial: "tcp", hosts: ["db.example.com"], ports: [65536] },
    inspection: { verified: false, port: null, pooled: false, reason: "invalid_port" },
  },
  {
    name: "a url naming port 0, which cannot be dialled",
    url: "postgres://coderso:secret@db.example.com:0/coderso",
    env: {},
    driver: { dial: "tcp", hosts: ["db.example.com"], ports: [0] },
    inspection: { verified: false, port: null, pooled: false, reason: "invalid_port" },
  },
  {
    // The reported fail-open: the port ARRAY says 5432 and the socket the driver
    // actually opens says 6432, because `path` is built from PGPORT.
    name: "a PGHOST socket directory whose port suffix disagrees with PGPORT",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "/var/run/pgbouncer:5432", PGPORT: "6432" },
    driver: { dial: "unix", path: "/var/run/pgbouncer:5432/.s.PGSQL.6432" },
    inspection: { verified: false, port: null, pooled: false, reason: "unix_socket_dial" },
  },
  {
    // Same class, with a host that is not even an absolute path: the driver's test
    // for "is this a socket" is a slash anywhere in the host string.
    name: "a relative PGHOST containing a slash",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "a/b:5432", PGPORT: "6432" },
    driver: { dial: "unix", path: "a/b:5432/.s.PGSQL.6432" },
    inspection: { verified: false, port: null, pooled: false, reason: "unix_socket_dial" },
  },
  {
    name: "a PGHOST unix socket directory taking the pooler's socket",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "/var/run/postgresql", PGPORT: "6432" },
    driver: { dial: "unix", path: "/var/run/postgresql/.s.PGSQL.6432" },
    inspection: { verified: false, port: null, pooled: false, reason: "unix_socket_dial" },
  },
  {
    // The over-refusing converse, deliberately: this socket IS the direct one, and
    // the guard still refuses it, because a socket path carries no TCP port that
    // can be compared with the pooler's. The remedy is a TCP DATABASE_DIRECT_URL.
    name: "a PGHOST unix socket directory taking the direct socket",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "/var/run/postgresql" },
    driver: { dial: "unix", path: "/var/run/postgresql/.s.PGSQL.5432" },
    inspection: { verified: false, port: null, pooled: false, reason: "unix_socket_dial" },
  },
  {
    // `path` is built from the WHOLE host string, comma list and all, so it beats
    // the failover list rather than being one of its entries.
    name: "a comma-separated PGHOST of socket directories",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "/var/run/a,/var/run/b" },
    driver: { dial: "unix", path: "/var/run/a,/var/run/b/.s.PGSQL.5432" },
    inspection: { verified: false, port: null, pooled: false, reason: "unix_socket_dial" },
  },
  {
    name: "a string the driver refuses outright",
    url: "host=db port=6432 dbname=coderso",
    env: {},
    driver: { dial: "refused" },
    inspection: { verified: false, port: null, pooled: false, reason: "unparsable_url" },
  },
  {
    // A PG variable that does not move the endpoint at all, yet decides whether the
    // driver will build a client for this environment: `tsa()` throws on it. A
    // projection narrower than the driver's own namespace missed it.
    name: "a PGTARGETSESSIONATTRS the driver refuses the whole environment over",
    url: "postgres://coderso:secret@db.example.com:5432/coderso",
    env: { PGTARGETSESSIONATTRS: "bogus" },
    driver: { dial: "refused" },
    inspection: { verified: false, port: null, pooled: false, reason: "unparsable_url" },
  },
  {
    name: "a PGTARGETSESSIONATTRS the driver accepts",
    url: "postgres://coderso:secret@db.example.com:5432/coderso",
    env: { PGTARGETSESSIONATTRS: "read-write" },
    driver: { dial: "tcp", hosts: ["db.example.com"], ports: [5432] },
    inspection: { verified: true, port: 5432, pooled: false },
  },
];

describe("postgres.js endpoint resolution", () => {
  // Only the names this file assigns to `process.env` itself; a value handed to the
  // guard through an env map is restored by the projection under test.
  const ambient = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const name of ENV_VARS_THIS_FILE_WRITES) {
      ambient.set(name, process.env[name]);
    }
  });

  afterEach(() => {
    for (const [name, value] of ambient) {
      setEnvVar(name, value);
    }
  });

  test.each(ENDPOINT_CASES)("the driver dials $name", (endpointCase) => {
    expect(askDriver(endpointCase.url, endpointCase.env)).toEqual(endpointCase.driver);
  });

  test.each(ENDPOINT_CASES)("resolveDriverDial reports $name", (endpointCase) => {
    const dial = resolveDriverDial(endpointCase.url, endpointCase.env);

    // The literal expectation, and the same one derived from what the driver
    // answers right now, so a driver upgrade moves both together.
    expect(dial).toEqual(expectedDial(endpointCase.driver));
    expect(dial).toEqual(expectedDial(askDriver(endpointCase.url, endpointCase.env)));
  });

  test.each(ENDPOINT_CASES)("the guard's verdict for $name is the driver's", (endpointCase) => {
    // The literal expectation, so a wrong verdict cannot hide behind a shared
    // helper...
    expect(inspectDatabaseUrl(endpointCase.url, POOLED_PORT, endpointCase.env)).toEqual(
      endpointCase.inspection
    );

    // ...and the same verdict derived from the dial the driver makes right now, so
    // a driver upgrade that moves an endpoint moves this expectation with it.
    expect(inspectDatabaseUrl(endpointCase.url, POOLED_PORT, endpointCase.env)).toEqual(
      expectedInspection(askDriver(endpointCase.url, endpointCase.env), POOLED_PORT)
    );
  });

  test("refuses a session target whose socket the driver takes from PGPORT", () => {
    // End to end through the production resolver, which is where the fail-open was
    // reported: PGHOST names a socket directory with a `:5432` suffix, the port
    // array says 5432, and the socket the driver opens is the pooler's.
    const env: DatabaseEnvMap = {
      [DATABASE_DIRECT_URL_ENV]: AUTHORITYLESS_URL,
      PGHOST: "/var/run/pgbouncer:5432",
      PGPORT: "6432",
    };

    expect(askDriver(AUTHORITYLESS_URL, env)).toEqual({
      dial: "unix",
      path: "/var/run/pgbouncer:5432/.s.PGSQL.6432",
    });
    expect(() => resolveSessionDatabaseTarget("startup database migrations", env)).toThrow(
      /session_database_direct_url_unverifiable/
    );

    // And through the DATABASE_URL fallback, on the same rule.
    const fallbackEnv: DatabaseEnvMap = {
      [DATABASE_URL_ENV]: AUTHORITYLESS_URL,
      PGHOST: "/var/run/pgbouncer:5432",
      PGPORT: "6432",
    };
    expect(() => resolveSessionDatabaseTarget("startup database migrations", fallbackEnv)).toThrow(
      /session_database_url_unverifiable/
    );
  });

  test("reads the env map it was handed, not the ambient environment", () => {
    process.env.PGHOST = "pgbouncer.ambient:6432";
    delete process.env.PGPORT;

    // An explicit map is the whole environment as far as the guard is concerned.
    expect(inspectDatabaseUrl(AUTHORITYLESS_URL, POOLED_PORT, {})).toEqual({
      verified: true,
      port: 5432,
      pooled: false,
    });

    delete process.env.PGHOST;
    expect(
      inspectDatabaseUrl(AUTHORITYLESS_URL, POOLED_PORT, { PGHOST: "pgbouncer.internal:6432" })
    ).toEqual({ verified: true, port: 6432, pooled: true });
  });

  test("projects the driver's whole PG namespace, not just the endpoint variables", () => {
    // The variable below is not part of any endpoint: it decides whether the driver
    // will build a client for this environment AT ALL. So the guard's answer has to
    // follow the caller's map in both directions, or a caller gets a verified target
    // from a driver that would refuse the very same environment.
    const url = "postgres://coderso:secret@db.example.com:5432/coderso";

    process.env.PGTARGETSESSIONATTRS = "bogus";
    // Ambient, and the caller's map does not set it: the driver must not see it.
    expect(inspectDatabaseUrl(url, POOLED_PORT, {})).toEqual({
      verified: true,
      port: 5432,
      pooled: false,
    });
    expect(process.env.PGTARGETSESSIONATTRS).toBe("bogus");

    delete process.env.PGTARGETSESSIONATTRS;
    // Not ambient, and the caller's map sets it: the driver must see it, and it
    // refuses to build a client, so nothing about the endpoint can be read.
    expect(inspectDatabaseUrl(url, POOLED_PORT, { PGTARGETSESSIONATTRS: "bogus" })).toEqual({
      verified: false,
      port: null,
      pooled: false,
      reason: "unparsable_url",
    });
    expect("PGTARGETSESSIONATTRS" in process.env).toBe(false);
  });

  test("puts the ambient environment back exactly as it found it", () => {
    process.env.PGHOST = "ambient.example.com:5433";
    delete process.env.PGPORT;

    inspectDatabaseUrl(AUTHORITYLESS_URL, POOLED_PORT, {
      PGHOST: "pgbouncer.internal:6432",
      PGPORT: "6432",
    });

    expect(process.env.PGHOST).toBe("ambient.example.com:5433");
    // Not the string "undefined", which is what assigning undefined would store.
    expect("PGPORT" in process.env).toBe(false);

    delete process.env.PGHOST;
    inspectDatabaseUrl(AUTHORITYLESS_URL, POOLED_PORT, { PGHOST: "pgbouncer.internal:6432" });
    expect("PGHOST" in process.env).toBe(false);
  });

  test("survives a connection string the driver throws on, without leaking the swap", () => {
    process.env.PGHOST = "ambient.example.com";

    expect(inspectDatabaseUrl("postgres://db.example.com:abc/coderso", POOLED_PORT, {})).toEqual({
      verified: false,
      port: null,
      pooled: false,
      reason: "unparsable_url",
    });
    expect(process.env.PGHOST).toBe("ambient.example.com");
  });

  test("the session client actually opens on the port the guard verified", async () => {
    // The seam the guard exists to protect: whatever port it certified as
    // direct must be the port the production connect function makes the driver
    // resolve. Nothing pooler-specific here on purpose — this is the general
    // shape, and any divergence between the guard and the driver breaks it.
    const env: DatabaseEnvMap = {
      [DATABASE_DIRECT_URL_ENV]: AUTHORITYLESS_URL,
      PGHOST: "direct.internal:5433",
    };

    const target = resolveSessionDatabaseTarget("startup database migrations", env);
    expect(target.port).toBe(5433);

    const client = withStubbedDriverEnv(env, () => createSessionDatabaseClient(target));
    try {
      expect(client.options.host).toEqual(["direct.internal"]);
      expect(client.options.port).toEqual([target.port]);
      // The dial is the TCP one, so those two fields really are the endpoint.
      expect(client.options.path).toBeFalsy();
    } finally {
      await client.end();
    }
  });
});

/**
 * The audit that makes an unrecognised driver over-refuse instead of failing open
 * a fourth time. `classifyDriverDial` reads endpoints out of nothing but the
 * option surface pinned here, so these are the cases where it must refuse to read
 * at all.
 */
describe("postgres.js option-surface audit", () => {
  const buildOptions = (): Sql["options"] =>
    postgres("postgres://coderso:secret@db.example.com:5432/coderso", { max: 1 }).options;

  /** The drift the classification refused on, or why it did not refuse. */
  const detailOf = (dial: DriverDial): string =>
    dial.kind === "unrecognized" ? dial.detail : `dial was not refused: ${dial.kind}`;

  test("the audited key set is the installed driver's key set", () => {
    // The upgrade tripwire: a postgres.js version that adds, removes or renames
    // ANY option fails here, and until someone re-reads connect() and updates the
    // dial surface, every classification below it answers `unrecognized`.
    expect(Object.keys(buildOptions()).sort()).toEqual([...AUDITED_DRIVER_OPTION_KEYS]);
  });

  test("reads the endpoint when the surface is the audited one", () => {
    expect(classifyDriverDial(buildOptions())).toEqual({
      kind: "tcp",
      endpoints: [{ host: "db.example.com", port: 5432 }],
    });
  });

  test("refuses an option surface that grew a field", () => {
    // The fourth-field case: a driver version that decided the endpoint somewhere
    // new must over-refuse here, not read the old fields and clear the target.
    const options = buildOptions();
    Object.assign(options, { endpoint: "pgbouncer.internal:6432" });

    expect(detailOf(classifyDriverDial(options))).toContain("unexpected: endpoint");
  });

  test("refuses an option surface that lost a field", () => {
    const options = buildOptions();
    expect(Reflect.deleteProperty(options, "path")).toBe(true);

    expect(detailOf(classifyDriverDial(options))).toContain("missing: path");
  });

  test("refuses an option surface whose host and port stopped being paired arrays", () => {
    const reshaped = buildOptions();
    Object.assign(reshaped, { port: 5432 });
    expect(classifyDriverDial(reshaped).kind).toBe("unrecognized");

    const unpaired = buildOptions();
    Object.assign(unpaired, { port: [5432, 6432] });
    expect(classifyDriverDial(unpaired).kind).toBe("unrecognized");

    const hostless = buildOptions();
    Object.assign(hostless, { host: [], port: [] });
    expect(classifyDriverDial(hostless).kind).toBe("unrecognized");
  });

  test("refuses a caller-supplied transport, which dials no endpoint of its own", () => {
    const neverCalledTransport = (): never => {
      throw new Error("the audit must not invoke the transport factory");
    };
    const options = buildOptions();
    Object.assign(options, { socket: neverCalledTransport });

    // `socket` is in the audited key set, so this is a recognised dial — just not
    // one with an endpoint to read.
    expect(classifyDriverDial(options)).toEqual({ kind: "custom_transport" });
  });
});

/**
 * The parallel-lane worker URL builder (`scripts/bun-lane-worker-url.ts`) is
 * only safe if its output stays compatible with the endpoint guard above: the
 * appended `?options=-csearch_path=` parameter must not move the dial, and the
 * per-worker pool budget must fit the Render direct-connection reserve. Pure
 * contract cases, no DB — the same guard as everything above this block,
 * applied to the worker lane's URLs instead of the session lane's.
 */
describe("worker URL builder guard compatibility", () => {
  const DIRECT_URL = "postgresql://u:p@db.example.com:5432/coderso?sslmode=require";
  const POOLED_URL = "postgresql://u:p@db.example.com:6432/coderso?sslmode=require";

  test("a worker URL with ?options=-csearch_path= still resolves as direct, non-pooled", () => {
    const url = buildWorkerDatabaseUrl(DIRECT_URL, 3);
    expect(url).toContain("options=-csearch_path%3Dbun_worker_3");

    // The driver's own dial, per this file's discipline: the appended parameter
    // must not move host or port, or the guard would certify the wrong endpoint.
    expect(askDriver(url, {})).toEqual({ dial: "tcp", hosts: ["db.example.com"], ports: [5432] });
    expect(inspectDatabaseUrl(url, POOLED_PORT)).toEqual({
      verified: true,
      port: 5432,
      pooled: false,
    });
  });

  test("a pooled URL is rejected by assertDirectUrl", () => {
    const url = buildWorkerDatabaseUrl(POOLED_URL, 0);
    expect(() => assertDirectUrl(url, POOLED_PORT)).toThrow("worker_direct_url_pooled");
  });

  test("the verdict tracks the configured pooled port, so a wrong one over-refuses, never certifies the pooler", () => {
    // The L02 contract pseudocode expected assertDirectUrl(url, 5432) to throw
    // as "unverifiable". It cannot: the guard compares the dial port to the
    // CONFIGURED pooled port and knows nothing about the pooler's real port
    // (connectionTargets.ts documents the cost — "an unusable value is a hard
    // error", but a plausible-but-wrong one silently weakens the comparison).
    // Pin the actual behavior so a fail-closed change turns this red.
    const url = buildWorkerDatabaseUrl(POOLED_URL, 0);
    expect(inspectDatabaseUrl(url, 5432)).toEqual({ verified: true, port: 6432, pooled: false });

    // The fail-closed direction of the same misconfiguration: a direct 5432 URL
    // with pooledPort=5432 is over-refused, never silently accepted as direct.
    expect(() => assertDirectUrl(buildWorkerDatabaseUrl(DIRECT_URL, 3), 5432)).toThrow(
      "worker_direct_url_pooled"
    );
  });

  test("worker schema names are stable and bounded", () => {
    expect(workerSchemaName(0)).toBe("bun_worker_0");
    expect(workerSchemaName(9)).toBe("bun_worker_9");
    expect(() => workerSchemaName(-1)).toThrow("worker_index_invalid");
    expect(() => workerSchemaName(1.5)).toThrow("worker_index_invalid");
  });

  test("workers x pool stays within the direct-connection reserve", () => {
    const workers = 5; // the resolveWorkerCount default
    const pool = DEFAULT_WORKER_POOL_MAX; // 2
    expect(workers * pool).toBeLessThanOrEqual(CONNECTION_BUDGET_MAX); // 10, Render direct reserve
    expect(pool).toBeLessThanOrEqual(MAX_WORKER_POOL_MAX); // 4
  });

  test("ambient DB_POOL_MAX=20 is clamped, never inherited, never throws", () => {
    const env: DatabaseEnvMap = { DB_POOL_MAX: "20", DATABASE_DIRECT_URL: DIRECT_URL };
    expect(resolveWorkerPoolMax(env)).toBeLessThanOrEqual(MAX_WORKER_POOL_MAX);
    expect(resolveWorkerPoolMax(env, 2)).toBe(2);
    expect(() => resolveWorkerPoolMax(env, 0)).toThrow("worker_pool_max_invalid");

    const workerEnv = resolveWorkerEnv(0, {}, env);
    expect(Number(workerEnv.DB_POOL_MAX)).toBeLessThanOrEqual(MAX_WORKER_POOL_MAX);
    expect(workerEnv.NODE_ENV).toBe("test");
  });
});
