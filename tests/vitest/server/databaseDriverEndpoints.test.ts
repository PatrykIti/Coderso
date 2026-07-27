import postgres from "postgres";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  DATABASE_DIRECT_URL_ENV,
  inspectDatabaseUrl,
  resolveSessionDatabaseTarget,
  type DatabaseEnvMap,
  type DatabaseUrlInspection,
} from "../../../core/db/connectionTargets";
import { resolveDriverEndpoints } from "../../../core/db/driverEndpoints";
import { createSessionDatabaseClient } from "../../../core/db/sessionClient";

/**
 * The pooler-port guard is only worth anything if its model of "where will the
 * driver connect?" is the DRIVER's answer. Twice now it was not: it ignored
 * `PGPORT`, then it ignored `PGHOST`, and both times it reported a VERIFIED
 * direct target while postgres.js dialled the pooler.
 *
 * So this file never asserts the guard against a hand-written parse. Every case
 * asks the installed postgres.js what it resolves — by building a client, which
 * parses options and opens no socket — and holds the guard to that answer.
 *
 * The driver's variables are spelled out as literals rather than imported: the
 * contract under test belongs to libpq and postgres.js, not to a constant the
 * guard could rename in step with its test.
 */
const DRIVER_ENDPOINT_ENV_VARS = ["PGHOST", "PGPORT"] as const;

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
 * Run `read` with the driver's host/port variables taken from `env`.
 *
 * Deliberately a second, independent copy of what `driverEndpoints.ts` does: a
 * test that reused the module's own projection could not catch that projection
 * being wrong.
 */
const withStubbedDriverEnv = <T>(env: DatabaseEnvMap, read: () => T): T => {
  const previous = DRIVER_ENDPOINT_ENV_VARS.map((name) => [name, process.env[name]] as const);
  for (const name of DRIVER_ENDPOINT_ENV_VARS) {
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

/** What postgres.js resolved, or null when it refused the connection string. */
type DriverAnswer = { hosts: string[]; ports: number[] } | null;

/**
 * Ask the installed driver where it would connect. Building a client allocates
 * one lazy `Connection` and dials nothing, so nothing here needs closing.
 */
const askDriver = (url: string, env: DatabaseEnvMap): DriverAnswer =>
  withStubbedDriverEnv(env, () => {
    try {
      const client = postgres(url, { max: 1 });
      return { hosts: [...client.options.host], ports: [...client.options.port] };
    } catch {
      return null;
    }
  });

/**
 * The verdict the guard MUST reach for a given driver answer, expressed once:
 * one endpoint, a dialable port, and the pooler comparison on that port. Feeding
 * it the driver's own numbers is what makes the agreement test non-circular —
 * the ports come from postgres.js, only the policy comes from here.
 */
const expectedInspection = (answer: DriverAnswer, pooledPort: number): DatabaseUrlInspection => {
  if (!answer) return { verified: false, port: null, pooled: false, reason: "unparsable_url" };
  if (answer.hosts.length !== 1) {
    return { verified: false, port: null, pooled: false, reason: "multiple_hosts" };
  }

  const port = answer.ports[0];
  if (port === undefined || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { verified: false, port: null, pooled: false, reason: "invalid_port" };
  }
  return { verified: true, port, pooled: port === pooledPort };
};

type EndpointCase = {
  name: string;
  url: string;
  env: DatabaseEnvMap;
  /** What postgres.js 3.4.9 resolves, observed against the installed driver. */
  driverHosts: string[];
  driverPorts: number[];
  /** What the guard must therefore report. */
  inspection: DatabaseUrlInspection;
};

/**
 * Each row is a shape of postgres.js's resolution, not a shape of a URL. The
 * ones that matter come from one driver rule: the port array is built from the
 * HOST string (`host.split(',').map(x => parseInt(x.split(':')[1] || port))`),
 * so a `:port` suffix carried by a host beats the scalar port, and the number of
 * endpoints follows the host list.
 */
const ENDPOINT_CASES: EndpointCase[] = [
  {
    name: "an explicit direct port",
    url: "postgres://coderso:secret@db.example.com:5432/coderso",
    env: {},
    driverHosts: ["db.example.com"],
    driverPorts: [5432],
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "PGHOST carrying the pooler port, for a url with no authority",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "pgbouncer.internal:6432" },
    driverHosts: ["pgbouncer.internal"],
    driverPorts: [6432],
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "a host-specific PGHOST port beating PGPORT",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "pgbouncer.internal:6432", PGPORT: "5432" },
    driverHosts: ["pgbouncer.internal"],
    driverPorts: [6432],
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "PGHOST without a port suffix",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "pgbouncer.internal" },
    driverHosts: ["pgbouncer.internal"],
    driverPorts: [5432],
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "a url authority beating PGHOST entirely",
    url: "postgres://coderso:secret@direct.example.com:5432/coderso",
    env: { PGHOST: "pgbouncer.internal:6432" },
    driverHosts: ["direct.example.com"],
    driverPorts: [5432],
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "no host anywhere",
    url: AUTHORITYLESS_URL,
    env: {},
    driverHosts: ["localhost"],
    driverPorts: [5432],
    inspection: { verified: true, port: 5432, pooled: false },
  },
  {
    name: "a comma-separated PGHOST that reaches the pooler on failover",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "direct.example.com:5432,pgbouncer.internal:6432" },
    driverHosts: ["direct.example.com", "pgbouncer.internal"],
    driverPorts: [5432, 6432],
    inspection: { verified: false, port: null, pooled: false, reason: "multiple_hosts" },
  },
  {
    name: "a comma-separated PGHOST with no port suffixes",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "direct.example.com,standby.example.com" },
    driverHosts: ["direct.example.com", "standby.example.com"],
    driverPorts: [5432, 5432],
    inspection: { verified: false, port: null, pooled: false, reason: "multiple_hosts" },
  },
  {
    name: "a comma-separated host list in the url",
    url: "postgres://coderso:secret@direct.example.com:5432,pgbouncer.internal:6432/coderso",
    env: {},
    driverHosts: ["direct.example.com", "pgbouncer.internal"],
    driverPorts: [5432, 6432],
    inspection: { verified: false, port: null, pooled: false, reason: "multiple_hosts" },
  },
  {
    name: "PGPORT for a url that omits the port",
    url: PORTLESS_URL,
    env: { PGPORT: "6432" },
    driverHosts: ["db.example.com"],
    driverPorts: [6432],
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "a PGPORT the driver parseInt()s down to the pooler port",
    url: PORTLESS_URL,
    env: { PGPORT: "6432abc" },
    driverHosts: ["db.example.com"],
    driverPorts: [6432],
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "a PGPORT that is not a number at all",
    url: PORTLESS_URL,
    env: { PGPORT: "not-a-port" },
    driverHosts: ["db.example.com"],
    driverPorts: [Number.NaN],
    inspection: { verified: false, port: null, pooled: false, reason: "invalid_port" },
  },
  {
    name: "a url naming port 0, which cannot be dialled",
    url: "postgres://coderso:secret@db.example.com:0/coderso",
    env: {},
    driverHosts: ["db.example.com"],
    driverPorts: [0],
    inspection: { verified: false, port: null, pooled: false, reason: "invalid_port" },
  },
  {
    name: "a PGHOST unix socket directory taking the pooler's socket",
    url: AUTHORITYLESS_URL,
    env: { PGHOST: "/var/run/postgresql", PGPORT: "6432" },
    driverHosts: ["/var/run/postgresql"],
    driverPorts: [6432],
    inspection: { verified: true, port: 6432, pooled: true },
  },
  {
    name: "a string the driver refuses outright",
    url: "host=db port=6432 dbname=coderso",
    env: {},
    driverHosts: [],
    driverPorts: [],
    inspection: { verified: false, port: null, pooled: false, reason: "unparsable_url" },
  },
];

describe("postgres.js endpoint resolution", () => {
  const ambient = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const name of DRIVER_ENDPOINT_ENV_VARS) {
      ambient.set(name, process.env[name]);
    }
  });

  afterEach(() => {
    for (const [name, value] of ambient) {
      setEnvVar(name, value);
    }
  });

  test.each(ENDPOINT_CASES)("the driver resolves $name", (endpointCase) => {
    const answer = askDriver(endpointCase.url, endpointCase.env);

    if (endpointCase.driverHosts.length === 0) {
      expect(answer).toBeNull();
      return;
    }

    expect(answer).toEqual({
      hosts: endpointCase.driverHosts,
      ports: endpointCase.driverPorts,
    });
  });

  test.each(ENDPOINT_CASES)("resolveDriverEndpoints reports $name", (endpointCase) => {
    const resolution = resolveDriverEndpoints(endpointCase.url, endpointCase.env);

    if (endpointCase.driverHosts.length === 0) {
      expect(resolution).toEqual({ resolved: false, endpoints: null });
      return;
    }

    expect(resolution).toEqual({
      resolved: true,
      endpoints: endpointCase.driverHosts.map((host, index) => {
        const port = endpointCase.driverPorts[index];
        const dialable = port !== undefined && Number.isInteger(port) && port >= 1 && port <= 65535;
        return { host, port: dialable ? port : null };
      }),
    });
  });

  test.each(ENDPOINT_CASES)("the guard's verdict for $name is the driver's", (endpointCase) => {
    // The literal expectation, so a wrong verdict cannot hide behind a shared
    // helper...
    expect(inspectDatabaseUrl(endpointCase.url, POOLED_PORT, endpointCase.env)).toEqual(
      endpointCase.inspection
    );

    // ...and the same verdict derived from what the driver answers right now, so
    // a driver upgrade that moves an endpoint moves this expectation with it.
    expect(inspectDatabaseUrl(endpointCase.url, POOLED_PORT, endpointCase.env)).toEqual(
      expectedInspection(askDriver(endpointCase.url, endpointCase.env), POOLED_PORT)
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
    } finally {
      await client.end();
    }
  });
});
