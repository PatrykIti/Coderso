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
    expect(inspectDatabaseUrl(POOLED_URL, 6432)).toEqual({ port: 6432, pooled: true });
    expect(inspectDatabaseUrl(DIRECT_URL, 6432)).toEqual({ port: 5432, pooled: false });
  });

  test("falls back to 5432 when the url omits the port", () => {
    expect(inspectDatabaseUrl(PORTLESS_URL, 6432)).toEqual({ port: 5432, pooled: false });
  });

  test("reports an unparsable connection string as an unknown port", () => {
    expect(inspectDatabaseUrl("host=db port=6432 dbname=coderso", 6432)).toEqual({
      port: null,
      pooled: false,
    });
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
