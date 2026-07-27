import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  DATABASE_DIRECT_URL_ENV,
  DATABASE_POOLED_PORT_ENV,
  DATABASE_URL_ENV,
  DEFAULT_POOLED_DATABASE_PORT,
  DEFAULT_POSTGRES_PORT,
  describeSessionDatabaseTarget,
  inspectDatabaseUrl,
  resolveDefaultDatabaseTarget,
  resolvePooledDatabasePort,
  resolveSessionDatabaseTarget,
  type DatabaseEnvMap,
} from "../../../core/db/connectionTargets";
import {
  resetSessionDatabaseWarnings,
  withResolvedSessionClient,
  type ClosableDatabaseClient,
  type SessionDatabaseConnect,
} from "../../../core/db/sessionClient";

const DIRECT_URL = "postgres://coderso:secret@db.example.com:5432/coderso";
const POOLED_URL = "postgres://coderso:secret@db.example.com:6432/coderso";
const PORTLESS_URL = "postgres://coderso:secret@db.example.com/coderso";

/**
 * libpq multi-host syntax. postgres.js supports it (it rewrites the URL to the
 * first host and fails over to the rest), and `new URL` rejects the ported form
 * while accepting the portless one — so neither "it parsed" nor "it did not
 * parse" says anything about where the driver connects. Both name the pooler as
 * a reachable endpoint.
 */
const MULTI_HOST_URL =
  "postgres://coderso:secret@direct.example.com:5432,pooler.example.com:6432/coderso";
const MULTI_HOST_PORTLESS_URL =
  "postgres://coderso:secret@direct.example.com,pooler.example.com/coderso";

/**
 * A url with no authority. postgres.js then resolves the host from `PGHOST`, and
 * reads that host's own `:port` suffix in preference to `PGPORT` and to 5432 —
 * which is how a connection string that names no port at all reaches the pooler.
 */
const AUTHORITYLESS_URL = "postgres:///coderso";

/**
 * libpq's own variable names, spelled out rather than imported: the contract
 * under test belongs to the driver, not to a constant the guard could rename in
 * step with the test. The literals also keep these cases asserting behaviour, so
 * they go red against any guard that ignores `PGPORT` or `PGHOST` rather than
 * failing to link.
 */
const PGPORT_ENV = "PGPORT";
const PGHOST_ENV = "PGHOST";

/**
 * Minimal stand-in for a driver client. `withResolvedSessionClient` is generic
 * over `ClosableDatabaseClient` — the only capability it uses itself — so this
 * needs no cast and the lifecycle can be asserted exactly.
 */
type FakeSessionClient = ClosableDatabaseClient & {
  ended: boolean;
};

function createFakeSessionClient(): FakeSessionClient {
  const client: FakeSessionClient = {
    ended: false,
    end: async () => {
      client.ended = true;
    },
  };
  return client;
}

function createLogger() {
  return { log: vi.fn<(message: string) => void>() };
}

describe("resolvePooledDatabasePort", () => {
  test("defaults to Render's PgBouncer port", () => {
    expect(resolvePooledDatabasePort({})).toBe(DEFAULT_POOLED_DATABASE_PORT);
    expect(DEFAULT_POOLED_DATABASE_PORT).toBe(6432);
    expect(DEFAULT_POSTGRES_PORT).toBe(5432);
  });

  test("honours an explicit override", () => {
    expect(resolvePooledDatabasePort({ [DATABASE_POOLED_PORT_ENV]: "7432" })).toBe(7432);
  });

  test("rejects a value that would silently disable the guard", () => {
    for (const value of ["0", "-1", "70000", "not-a-port", "6432.5"]) {
      expect(() => resolvePooledDatabasePort({ [DATABASE_POOLED_PORT_ENV]: value })).toThrow(
        /^database_pooled_port_invalid:/
      );
    }
  });
});

describe("inspectDatabaseUrl", () => {
  test("reads the explicit port", () => {
    expect(inspectDatabaseUrl(POOLED_URL, 6432, {})).toEqual({
      verified: true,
      port: 6432,
      pooled: true,
    });
    expect(inspectDatabaseUrl(DIRECT_URL, 6432, {})).toEqual({
      verified: true,
      port: 5432,
      pooled: false,
    });
  });

  test("falls back to 5432 when the url omits the port", () => {
    expect(inspectDatabaseUrl(PORTLESS_URL, 6432, {})).toEqual({
      verified: true,
      port: 5432,
      pooled: false,
    });
  });

  test("reports an unparsable connection string as unverifiable", () => {
    expect(inspectDatabaseUrl("host=db port=6432 dbname=coderso", 6432, {})).toEqual({
      verified: false,
      port: null,
      pooled: false,
      reason: "unparsable_url",
    });
  });

  test("refuses to name a port for a comma-separated host list", () => {
    // `new URL` rejects this one, so the old shape reported it as port null.
    expect(inspectDatabaseUrl(MULTI_HOST_URL, 6432, {})).toEqual({
      verified: false,
      port: null,
      pooled: false,
      reason: "multiple_hosts",
    });

    // ...and ACCEPTS this one, hostname "direct.example.com,pooler.example.com",
    // which the old shape reported as a verified port 5432. Both are host lists
    // the driver fails over between, so neither has a single port.
    expect(inspectDatabaseUrl(MULTI_HOST_PORTLESS_URL, 6432, {})).toEqual({
      verified: false,
      port: null,
      pooled: false,
      reason: "multiple_hosts",
    });

    // Percent-encoded comma: the driver decodes the authority before splitting.
    expect(
      inspectDatabaseUrl("postgres://coderso:secret@direct%2Cpooler/coderso", 6432, {}).verified
    ).toBe(false);
  });

  test("checks a portless url against the port PGPORT would give the driver", () => {
    expect(inspectDatabaseUrl(PORTLESS_URL, 6432, { [PGPORT_ENV]: "6432" })).toEqual({
      verified: true,
      port: 6432,
      pooled: true,
    });
    expect(inspectDatabaseUrl(PORTLESS_URL, 6432, { [PGPORT_ENV]: "5432" })).toEqual({
      verified: true,
      port: 5432,
      pooled: false,
    });
    expect(inspectDatabaseUrl(PORTLESS_URL, 6432, { [PGPORT_ENV]: "not-a-port" })).toEqual({
      verified: false,
      port: null,
      pooled: false,
      reason: "invalid_port",
    });
  });

  test("checks a url with no authority against the host-specific port in PGHOST", () => {
    // postgres.js resolves the host as `url.hostname || PGHOST || 'localhost'`
    // and then reads each host's own `:port` suffix, so an authority-less url
    // plus `PGHOST=host:6432` lands on the pooler even though nothing in the
    // connection string says 6432. Reading the string alone cleared this as
    // "port 5432, direct" — the exact fail-open the guard exists to prevent.
    expect(
      inspectDatabaseUrl(AUTHORITYLESS_URL, 6432, { [PGHOST_ENV]: "pooler.example.com:6432" })
    ).toEqual({ verified: true, port: 6432, pooled: true });

    expect(
      inspectDatabaseUrl(AUTHORITYLESS_URL, 6432, { [PGHOST_ENV]: "direct.example.com:5432" })
    ).toEqual({ verified: true, port: 5432, pooled: false });
  });

  test("refuses to name a port for a comma-separated PGHOST", () => {
    // Same failover semantics as a host list in the url, and the same hazard:
    // the second entry is the pooler.
    expect(
      inspectDatabaseUrl(AUTHORITYLESS_URL, 6432, {
        [PGHOST_ENV]: "direct.example.com:5432,pooler.example.com:6432",
      })
    ).toEqual({ verified: false, port: null, pooled: false, reason: "multiple_hosts" });
  });
});

describe("resolveDefaultDatabaseTarget", () => {
  test("accepts the pooled url and flags it as pooled", () => {
    expect(resolveDefaultDatabaseTarget({ [DATABASE_URL_ENV]: POOLED_URL })).toEqual({
      url: POOLED_URL,
      port: 6432,
      pooled: true,
    });
  });

  test("still accepts a direct url for the default client", () => {
    expect(resolveDefaultDatabaseTarget({ [DATABASE_URL_ENV]: DIRECT_URL })).toEqual({
      url: DIRECT_URL,
      port: 5432,
      pooled: false,
    });
  });

  test("throws when DATABASE_URL is missing or blank", () => {
    expect(() => resolveDefaultDatabaseTarget({})).toThrow("DATABASE_URL is not set");
    expect(() => resolveDefaultDatabaseTarget({ [DATABASE_URL_ENV]: "   " })).toThrow(
      "DATABASE_URL is not set"
    );
  });
});

describe("resolveSessionDatabaseTarget", () => {
  test("prefers the explicit direct url over a pooled DATABASE_URL", () => {
    const target = resolveSessionDatabaseTarget("startup database migrations", {
      [DATABASE_URL_ENV]: POOLED_URL,
      [DATABASE_DIRECT_URL_ENV]: DIRECT_URL,
    });

    expect(target).toEqual({ url: DIRECT_URL, port: 5432, source: "direct_url_env" });
    expect(describeSessionDatabaseTarget(target)).toBe(`${DATABASE_DIRECT_URL_ENV} (port 5432)`);
  });

  test("refuses when DATABASE_URL is pooled and no direct url is configured", () => {
    let thrown: unknown;
    try {
      resolveSessionDatabaseTarget("startup database migrations", {
        [DATABASE_URL_ENV]: POOLED_URL,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : "";
    expect(message).toMatch(/^session_database_url_pooled: startup database migrations/);
    expect(message).toContain(DATABASE_DIRECT_URL_ENV);
    expect(message).toContain("6432");
    // Never echo credentials back into logs.
    expect(message).not.toContain("secret");
  });

  test("refuses a DATABASE_DIRECT_URL that actually points at the pooler", () => {
    expect(() =>
      resolveSessionDatabaseTarget("scheduled backup single-flight lock", {
        [DATABASE_URL_ENV]: POOLED_URL,
        [DATABASE_DIRECT_URL_ENV]: POOLED_URL,
      })
    ).toThrow(/^session_database_direct_url_pooled:/);
  });

  test("refuses a DATABASE_DIRECT_URL that names several hosts", () => {
    let thrown: unknown;
    try {
      resolveSessionDatabaseTarget("startup database migrations", {
        [DATABASE_URL_ENV]: POOLED_URL,
        [DATABASE_DIRECT_URL_ENV]: MULTI_HOST_URL,
      });
    } catch (error) {
      thrown = error;
    }

    // Being set explicitly is not evidence of being direct: the driver accepts
    // this list and can land on pooler.example.com:6432.
    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : "";
    expect(message).toMatch(
      /^session_database_direct_url_unverifiable: startup database migrations/
    );
    expect(message).toContain("comma-separated hosts");
    expect(message).toContain(DATABASE_DIRECT_URL_ENV);
    expect(message).not.toContain("secret");
  });

  test("refuses a DATABASE_URL fallback that names several hosts", () => {
    // The portless list parses as a URL, so the port-null check alone never saw it.
    expect(() =>
      resolveSessionDatabaseTarget("scheduled backup single-flight lock", {
        [DATABASE_URL_ENV]: MULTI_HOST_PORTLESS_URL,
      })
    ).toThrow(/^session_database_url_unverifiable: scheduled backup single-flight lock/);
  });

  test("refuses a DATABASE_DIRECT_URL it cannot parse at all", () => {
    expect(() =>
      resolveSessionDatabaseTarget("startup assistant docs reindex", {
        [DATABASE_DIRECT_URL_ENV]: "host=db port=5432 dbname=coderso",
      })
    ).toThrow(/^session_database_direct_url_unverifiable:/);
  });

  test("resolves a portless DATABASE_DIRECT_URL against PGPORT, not against 5432", () => {
    // postgres.js uses PGPORT when the url omits a port, so PGPORT=6432 makes
    // this direct-looking url the pooler.
    expect(() =>
      resolveSessionDatabaseTarget("startup database migrations", {
        [DATABASE_DIRECT_URL_ENV]: PORTLESS_URL,
        [PGPORT_ENV]: "6432",
      })
    ).toThrow(/^session_database_direct_url_pooled:/);

    expect(
      resolveSessionDatabaseTarget("startup database migrations", {
        [DATABASE_DIRECT_URL_ENV]: PORTLESS_URL,
        [PGPORT_ENV]: "5432",
      })
    ).toEqual({ url: PORTLESS_URL, port: 5432, source: "direct_url_env" });
  });

  test("refuses a DATABASE_DIRECT_URL that PGHOST points at the pooler", () => {
    // The url names no port and no host at all: everything the driver will dial
    // comes from PGHOST, including the pooler port.
    expect(() =>
      resolveSessionDatabaseTarget("startup database migrations", {
        [DATABASE_DIRECT_URL_ENV]: AUTHORITYLESS_URL,
        [PGHOST_ENV]: "pooler.example.com:6432",
      })
    ).toThrow(/^session_database_direct_url_pooled:/);

    // ...and the fallback path refuses on the same rule.
    expect(() =>
      resolveSessionDatabaseTarget("scheduled backup single-flight lock", {
        [DATABASE_URL_ENV]: AUTHORITYLESS_URL,
        [PGHOST_ENV]: "pooler.example.com:6432",
      })
    ).toThrow(/^session_database_url_pooled:/);

    // A PGHOST that names the direct port is still accepted, so the guard is
    // refusing the pooler rather than refusing PGHOST.
    expect(
      resolveSessionDatabaseTarget("startup database migrations", {
        [DATABASE_DIRECT_URL_ENV]: AUTHORITYLESS_URL,
        [PGHOST_ENV]: "direct.example.com:5432",
      })
    ).toEqual({ url: AUTHORITYLESS_URL, port: 5432, source: "direct_url_env" });
  });

  test("honours a custom pooler port on both sides of the guard", () => {
    const env: DatabaseEnvMap = {
      [DATABASE_URL_ENV]: "postgres://coderso:secret@db.example.com:7000/coderso",
      [DATABASE_POOLED_PORT_ENV]: "7000",
    };
    expect(() => resolveSessionDatabaseTarget("startup assistant docs reindex", env)).toThrow(
      /^session_database_url_pooled:/
    );

    // 6432 is no longer treated as the pooler once the port is overridden.
    expect(
      resolveSessionDatabaseTarget("startup assistant docs reindex", {
        ...env,
        [DATABASE_URL_ENV]: POOLED_URL,
      }).port
    ).toBe(6432);
  });

  test("falls back to a non-pooled DATABASE_URL and records the fallback", () => {
    const target = resolveSessionDatabaseTarget("startup database migrations", {
      [DATABASE_URL_ENV]: PORTLESS_URL,
    });

    expect(target).toEqual({ url: PORTLESS_URL, port: 5432, source: "database_url_fallback" });
    expect(describeSessionDatabaseTarget(target)).toBe(
      `${DATABASE_URL_ENV} fallback (port 5432, not pooled)`
    );
  });

  test("refuses a fallback url whose port cannot be verified", () => {
    expect(() =>
      resolveSessionDatabaseTarget("startup database migrations", {
        [DATABASE_URL_ENV]: "host=db port=5432 dbname=coderso",
      })
    ).toThrow(/^session_database_url_unverifiable:/);
  });

  test("refuses when no connection string is configured at all", () => {
    expect(() => resolveSessionDatabaseTarget("startup database migrations", {})).toThrow(
      /^session_database_url_missing:/
    );
  });
});

describe("withResolvedSessionClient", () => {
  beforeEach(() => {
    resetSessionDatabaseWarnings();
  });

  afterEach(() => {
    resetSessionDatabaseWarnings();
  });

  test("connects to the direct target and always closes the session", async () => {
    const fake = createFakeSessionClient();
    const connected: string[] = [];
    const connect: SessionDatabaseConnect<FakeSessionClient> = (target) => {
      connected.push(target.url);
      return fake;
    };

    const result = await withResolvedSessionClient(
      "startup database migrations",
      connect,
      async (client) => {
        expect(client).toBe(fake);
        expect(client.ended).toBe(false);
        return "locked";
      },
      {
        env: { [DATABASE_URL_ENV]: POOLED_URL, [DATABASE_DIRECT_URL_ENV]: DIRECT_URL },
        logger: createLogger(),
      }
    );

    expect(result).toBe("locked");
    expect(connected).toEqual([DIRECT_URL]);
    expect(fake.ended).toBe(true);
  });

  test("closes the session when the action throws", async () => {
    const fake = createFakeSessionClient();
    const failure = new Error("reindex failed");

    await expect(
      withResolvedSessionClient(
        "startup assistant docs reindex",
        () => fake,
        async () => {
          throw failure;
        },
        { env: { [DATABASE_DIRECT_URL_ENV]: DIRECT_URL }, logger: createLogger() }
      )
    ).rejects.toBe(failure);

    expect(fake.ended).toBe(true);
  });

  test("refuses to open a session lock through the pooled port", async () => {
    const connect = vi.fn<SessionDatabaseConnect<FakeSessionClient>>(() =>
      createFakeSessionClient()
    );

    await expect(
      withResolvedSessionClient(
        "scheduled backup single-flight lock",
        connect,
        async () => "unreachable",
        { env: { [DATABASE_URL_ENV]: POOLED_URL }, logger: createLogger() }
      )
    ).rejects.toThrow(/^session_database_url_pooled: scheduled backup single-flight lock/);

    // Fail closed BEFORE connecting: no lock is ever taken on a pooled backend.
    expect(connect).not.toHaveBeenCalled();
  });

  test("warns once per purpose when it falls back to DATABASE_URL", async () => {
    const logger = createLogger();
    const env: DatabaseEnvMap = { [DATABASE_URL_ENV]: DIRECT_URL };
    const run = () =>
      withResolvedSessionClient(
        "startup database migrations",
        () => createFakeSessionClient(),
        async () => null,
        { env, logger }
      );

    await run();
    await run();

    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log.mock.calls[0]?.[0]).toContain(DATABASE_DIRECT_URL_ENV);
  });

  test("stays quiet when the direct url is configured explicitly", async () => {
    const logger = createLogger();

    await withResolvedSessionClient(
      "startup database migrations",
      () => createFakeSessionClient(),
      async () => null,
      {
        env: { [DATABASE_URL_ENV]: POOLED_URL, [DATABASE_DIRECT_URL_ENV]: DIRECT_URL },
        logger,
      }
    );

    expect(logger.log).not.toHaveBeenCalled();
  });
});
