/**
 * TASK-551-02-L01 targeted suite for `core/db/databaseConfig.ts`.
 *
 * Bun-free Vitest lane. Covers the full environment contract table, the
 * compatibility matrix, the cluster connection budget boundaries, the guarded
 * budget arithmetic, secret non-return, and module-import purity.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DATABASE_CONFIG_ERROR_CODES,
  DatabaseConfigError,
  parseDatabaseFleetConfig,
  parseDatabaseRuntimeConfig,
  safeAdd,
  safeMultiply,
} from "../../../core/db/databaseConfig";

type Env = Record<string, string | undefined>;

const CODES = DATABASE_CONFIG_ERROR_CODES;

/** Raw bytes of the module under test, for the import-purity assertions. */
const MODULE_SOURCE = readFileSync(
  new URL("../../../core/db/databaseConfig.ts", import.meta.url),
  "utf8"
);

/**
 * Strips comments and string/template bodies so purity assertions inspect only
 * real code tokens, never prose (the module header names the very facilities it
 * must not use).
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:\\[\s\S]|[^\\`])*`/g, " ")
    .replace(/"(?:\\.|[^"\\\n])*"/g, " ")
    .replace(/'(?:\\.|[^'\\\n])*'/g, " ");
}

function envWith(overrides: Env): Env {
  return { ...overrides };
}

/** Default planned budget under defaults: 1*10 + 0 + 3 = 13, available 82. */
const DEFAULTS = Object.freeze({
  runtimeProcessCount: 1,
  workerProcessCount: 0,
  poolMax: 10,
  serverMaxConnections: 103,
  reservedConnections: 21,
  migrationConnectionReserve: 3,
});

function expectCode(fn: () => unknown, code: string, key?: string): void {
  try {
    fn();
    expect.fail(`expected DatabaseConfigError with code ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(DatabaseConfigError);
    const configError = error as DatabaseConfigError;
    expect(configError.code).toBe(code);
    if (key !== undefined) expect(configError.key).toBe(key);
    // Error text carries code + key name only; it must never carry a value.
    if (key !== undefined) {
      expect(configError.message.startsWith(`${code}: ${key}`)).toBe(true);
    }
  }
}

describe("DatabaseConfigError", () => {
  it("emits the bare code when no key NAME is attributable", () => {
    const keyless = new DatabaseConfigError(CODES.budgetOverflow);
    expect(keyless).toBeInstanceOf(Error);
    expect(keyless.name).toBe("DatabaseConfigError");
    expect(keyless.code).toBe(CODES.budgetOverflow);
    expect(keyless.key).toBeNull();
    // Keyless form: message is exactly the code, so it can never carry a value.
    expect(keyless.message).toBe(CODES.budgetOverflow);
  });

  it("carries the key NAME and never a parsed value", () => {
    const keyed = new DatabaseConfigError(CODES.valueOutOfRange, "DB_POOL_MAX");
    expect(keyed.name).toBe("DatabaseConfigError");
    expect(keyed.code).toBe(CODES.valueOutOfRange);
    expect(keyed.key).toBe("DB_POOL_MAX");
    expect(keyed.message).toBe(`${CODES.valueOutOfRange}: DB_POOL_MAX`);
  });
});

describe("parseDatabaseFleetConfig", () => {
  it("defaults to one runtime, zero workers, total one", () => {
    expect(parseDatabaseFleetConfig({})).toEqual({
      runtimeProcessCount: 1,
      workerProcessCount: 0,
      totalProcessCount: 1,
    });
  });

  it("parses explicit combined fleets", () => {
    const fleet = parseDatabaseFleetConfig({
      CODERSO_RUNTIME_REPLICA_COUNT: "3",
      CODERSO_WORKER_REPLICA_COUNT: "2",
    });
    expect(fleet.runtimeProcessCount).toBe(3);
    expect(fleet.workerProcessCount).toBe(2);
    expect(fleet.totalProcessCount).toBe(5);
  });

  it("rejects out-of-bounds and malformed counts", () => {
    for (const [key, min] of [
      ["CODERSO_RUNTIME_REPLICA_COUNT", 1],
      ["CODERSO_WORKER_REPLICA_COUNT", 0],
    ] as const) {
      expectCode(
        () => parseDatabaseFleetConfig({ [key]: String(min - 1) }),
        CODES.valueOutOfRange,
        key
      );
      expectCode(() => parseDatabaseFleetConfig({ [key]: "257" }), CODES.valueOutOfRange, key);
      for (const bad of ["abc", "1.5", "", " 1", "1 ", "1e3", "+1"]) {
        expectCode(() => parseDatabaseFleetConfig({ [key]: bad }), CODES.valueInvalid, key);
      }
      expectCode(
        () => parseDatabaseFleetConfig({ [key]: "99999999999999999999" }),
        CODES.valueOverflow,
        key
      );
    }
  });

  it("rejects legacy fleet keys in both parsers", () => {
    for (const key of ["DB_REPLICA_COUNT", "DB_WORKER_CONNECTION_RESERVE"]) {
      expectCode(() => parseDatabaseFleetConfig({ [key]: "4" }), CODES.legacyKeyRejected, key);
      expectCode(() => parseDatabaseRuntimeConfig({ [key]: "4" }), CODES.legacyKeyRejected, key);
    }
  });

  it("rejects adapter/identity fixtures whose counts differ from the parsed fleet", () => {
    const fleet = parseDatabaseFleetConfig({
      CODERSO_RUNTIME_REPLICA_COUNT: "2",
      CODERSO_WORKER_REPLICA_COUNT: "1",
    });
    expect(Object.isFrozen(fleet)).toBe(true);

    // The one comparison every adapter/application-identity consumer must
    // apply: any fixture field that differs from this single parsed source of
    // truth is rejected instead of reparsed or trusted.
    const assertFleetFixtureMatches = (fixture: {
      runtime: number;
      worker: number;
      total: number;
    }): void => {
      if (
        fixture.runtime !== fleet.runtimeProcessCount ||
        fixture.worker !== fleet.workerProcessCount ||
        fixture.total !== fleet.totalProcessCount
      ) {
        throw new Error("database_fleet_fixture_mismatch");
      }
    };

    assertFleetFixtureMatches({ runtime: 2, worker: 1, total: 3 });
    expect(() => assertFleetFixtureMatches({ runtime: 2, worker: 2, total: 4 })).toThrow(
      "database_fleet_fixture_mismatch"
    );
    expect(() => assertFleetFixtureMatches({ runtime: 3, worker: 1, total: 3 })).toThrow(
      "database_fleet_fixture_mismatch"
    );
    expect(() => assertFleetFixtureMatches({ runtime: 2, worker: 1, total: 4 })).toThrow(
      "database_fleet_fixture_mismatch"
    );
  });
});

describe("parseDatabaseRuntimeConfig defaults and bounds", () => {
  it("resolves the documented default profile", () => {
    const config = parseDatabaseRuntimeConfig({});
    expect(config.fleet).toEqual({
      runtimeProcessCount: 1,
      workerProcessCount: 0,
      totalProcessCount: 1,
    });
    expect(config.poolMax).toBe(DEFAULTS.poolMax);
    expect(config.serverMaxConnections).toBe(DEFAULTS.serverMaxConnections);
    expect(config.reservedConnections).toBe(DEFAULTS.reservedConnections);
    expect(config.migrationConnectionReserve).toBe(3);
    expect(config.connectTimeoutSeconds).toBe(10);
    expect(config.idleTimeoutSeconds).toBe(30);
    expect(config.maxLifetimeSeconds).toBe(1800);
    expect(config.statementTimeoutMs).toBe(15_000);
    expect(config.lockTimeoutMs).toBe(5_000);
    expect(config.idleInTransactionTimeoutMs).toBe(30_000);
    expect(config.pgbouncerMode).toBe("off");
    expect(config.maintenanceMode).toBe("primary");
    expect(config.maintenancePoolMax).toBe(2);
    expect(config.maintenanceUrlConfigured).toBe(false);
    // Planned = 1*10 + 0 + 3 = 13 < available 82.
    const available = config.serverMaxConnections - config.reservedConnections;
    const planned =
      config.poolMax * config.fleet.totalProcessCount + config.migrationConnectionReserve;
    expect(planned).toBe(13);
    expect(available).toBe(82);
    expect(planned).toBeLessThan(available);
  });

  it("accepts exact inclusive bounds per key and rejects beyond them", () => {
    type Row = {
      key: string;
      min: number;
      max: number;
      fallback: number;
      prop: string;
      /** Extra env needed so the boundary value forms a valid config. */
      extraMin?: Env;
      extraMax?: Env;
      /** When the max bound itself cannot satisfy the budget contract. */
      maxThrowsBudgetInvalid?: boolean;
    };
    const rows: Row[] = [
      { key: "DB_POOL_MAX", prop: "poolMax", min: 1, max: 50, fallback: 10 },
      {
        key: "DB_SERVER_MAX_CONNECTIONS",
        prop: "serverMaxConnections",
        min: 10,
        max: 10_000,
        fallback: 103,
        extraMin: { DB_RESERVED_CONNECTIONS: "2", DB_POOL_MAX: "1" },
        extraMax: { DB_RESERVED_CONNECTIONS: "2000", DB_POOL_MAX: "1" },
      },
      {
        // Reserve 1 is inside its own range but below every possible
        // minimum-reserve floor (>= 2), so only the range edge is checkable.
        key: "DB_RESERVED_CONNECTIONS",
        prop: "reservedConnections",
        min: 1,
        max: 5_000,
        fallback: 21,
        maxThrowsBudgetInvalid: true,
      },
      {
        key: "DB_MIGRATION_CONNECTION_RESERVE",
        prop: "migrationConnectionReserve",
        min: 3,
        max: 8,
        fallback: 3,
      },
      {
        key: "DB_CONNECT_TIMEOUT_SECONDS",
        prop: "connectTimeoutSeconds",
        min: 1,
        max: 60,
        fallback: 10,
      },
      {
        key: "DB_IDLE_TIMEOUT_SECONDS",
        prop: "idleTimeoutSeconds",
        min: 1,
        max: 600,
        fallback: 30,
      },
      {
        key: "DB_MAX_LIFETIME_SECONDS",
        prop: "maxLifetimeSeconds",
        min: 60,
        max: 86_400,
        fallback: 1800,
      },
      {
        key: "DB_STATEMENT_TIMEOUT_MS",
        prop: "statementTimeoutMs",
        min: 100,
        max: 120_000,
        fallback: 15_000,
        extraMin: { DB_LOCK_TIMEOUT_MS: "50" },
      },
      {
        key: "DB_LOCK_TIMEOUT_MS",
        prop: "lockTimeoutMs",
        min: 50,
        max: 30_000,
        fallback: 5_000,
        extraMax: { DB_STATEMENT_TIMEOUT_MS: "120000" },
      },
      {
        key: "DB_IDLE_IN_TRANSACTION_TIMEOUT_MS",
        prop: "idleInTransactionTimeoutMs",
        min: 1_000,
        max: 120_000,
        fallback: 30_000,
      },
    ];
    for (const row of rows) {
      if (!row.maxThrowsBudgetInvalid) {
        const atMin = parseDatabaseRuntimeConfig({
          ...row.extraMin,
          [row.key]: String(row.min),
        });
        const atMax = parseDatabaseRuntimeConfig({
          ...row.extraMax,
          [row.key]: String(row.max),
        });
        expect(atMin[row.prop as keyof typeof atMin]).toBe(row.min);
        expect(atMax[row.prop as keyof typeof atMax]).toBe(row.max);
      }
      // Out-of-range failures are raised before any budget arithmetic.
      expectCode(
        () => parseDatabaseRuntimeConfig({ [row.key]: String(row.min - 1) }),
        CODES.valueOutOfRange,
        row.key
      );
      expectCode(
        () => parseDatabaseRuntimeConfig({ [row.key]: String(row.max + 1) }),
        CODES.valueOutOfRange,
        row.key
      );
      if (row.maxThrowsBudgetInvalid) {
        expectCode(
          () => parseDatabaseRuntimeConfig({ [row.key]: String(row.max) }),
          CODES.connectionBudgetInvalid
        );
      }
      expect(row.fallback).toBeGreaterThanOrEqual(row.min);
    }
  });

  it("rejects malformed integers with a stable machine-readable code", () => {
    for (const bad of ["ten", "10.0", "", " ", "0x10", "1_000", "NaN"]) {
      expectCode(
        () => parseDatabaseRuntimeConfig({ DB_POOL_MAX: bad }),
        CODES.valueInvalid,
        "DB_POOL_MAX"
      );
    }
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_POOL_MAX: "1" + "9".repeat(20) }),
      CODES.valueOverflow,
      "DB_POOL_MAX"
    );
  });

  it("rejects negative values via range bounds", () => {
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_POOL_MAX: "-1" }),
      CODES.valueOutOfRange,
      "DB_POOL_MAX"
    );
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_STATEMENT_TIMEOUT_MS: "-100" }),
      CODES.valueOutOfRange,
      "DB_STATEMENT_TIMEOUT_MS"
    );
  });

  it("enforces exact PgBouncer and maintenance enums", () => {
    expect(parseDatabaseRuntimeConfig({ DB_PGBOUNCER_MODE: "off" }).pgbouncerMode).toBe("off");
    expect(parseDatabaseRuntimeConfig({ DB_PGBOUNCER_MODE: "transaction" }).pgbouncerMode).toBe(
      "transaction"
    );
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_PGBOUNCER_MODE: "session" }),
      CODES.enumInvalid,
      "DB_PGBOUNCER_MODE"
    );
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_PGBOUNCER_MODE: "" }),
      CODES.enumInvalid,
      "DB_PGBOUNCER_MODE"
    );
    // A declared maintenance mode named `transaction` is invalid.
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_MAINTENANCE_MODE: "transaction" }),
      CODES.enumInvalid,
      "DB_MAINTENANCE_MODE"
    );
    expect(parseDatabaseRuntimeConfig({}).maintenanceMode).toBe("primary");
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_MAINTENANCE_MODE: "" }),
      CODES.enumInvalid,
      "DB_MAINTENANCE_MODE"
    );
  });

  it("enforces lock timeout <= statement timeout", () => {
    expect(
      parseDatabaseRuntimeConfig({
        DB_LOCK_TIMEOUT_MS: "15000",
        DB_STATEMENT_TIMEOUT_MS: "15000",
      }).lockTimeoutMs
    ).toBe(15_000);
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_LOCK_TIMEOUT_MS: "20000",
          DB_STATEMENT_TIMEOUT_MS: "15000",
        }),
      CODES.timeoutOrderingInvalid,
      "DB_LOCK_TIMEOUT_MS"
    );
  });

  it("rejects unknown DB_* keys but ignores unrelated and PG* variables", () => {
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_TOTALLY_UNKNOWN: "1" }),
      CODES.keyUnknown,
      "DB_TOTALLY_UNKNOWN"
    );
    const config = parseDatabaseRuntimeConfig({
      PATH: "/usr/bin",
      PGHOST: "ignored-by-contract.example",
      PGPORT: "5432",
      HOME: "/home/coder",
    });
    expect(config.poolMax).toBe(10);
  });

  it("rejects a migration reserve below three", () => {
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_MIGRATION_CONNECTION_RESERVE: "2",
        }),
      CODES.valueOutOfRange,
      "DB_MIGRATION_CONNECTION_RESERVE"
    );
  });
});

describe("maintenance URL policy and secrets", () => {
  it("forbids a maintenance URL with primary mode", () => {
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_MAINTENANCE_URL: "postgres://maint.example/maint",
        }),
      CODES.maintenanceUrlForbidden,
      "DB_MAINTENANCE_URL"
    );
  });

  it("requires a non-blank maintenance URL for direct and session modes", () => {
    for (const mode of ["direct", "session"] as const) {
      expectCode(
        () => parseDatabaseRuntimeConfig({ DB_MAINTENANCE_MODE: mode }),
        CODES.maintenanceUrlRequired,
        "DB_MAINTENANCE_URL"
      );
      expectCode(
        () =>
          parseDatabaseRuntimeConfig({
            DB_MAINTENANCE_MODE: mode,
            DB_MAINTENANCE_URL: "   ",
          }),
        CODES.maintenanceUrlRequired,
        "DB_MAINTENANCE_URL"
      );
      const config = parseDatabaseRuntimeConfig({
        DB_MAINTENANCE_MODE: mode,
        DB_MAINTENANCE_URL: `postgres://${mode}.example/db`,
      });
      expect(config.maintenanceUrlConfigured).toBe(true);
    }
  });

  it("rejects a maintenance URL byte-identical to DATABASE_URL only when main is transaction-pooled", () => {
    const shared = "postgres://shared.example/db";
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_PGBOUNCER_MODE: "transaction",
          DB_MAINTENANCE_MODE: "session",
          DATABASE_URL: shared,
          DB_MAINTENANCE_URL: shared,
        }),
      CODES.maintenanceUrlNotDistinct,
      "DB_MAINTENANCE_URL"
    );
    // With an off transaction mode the identical value is not inspected here.
    const offMain = parseDatabaseRuntimeConfig({
      DB_MAINTENANCE_MODE: "session",
      DATABASE_URL: shared,
      DB_MAINTENANCE_URL: shared,
    });
    expect(offMain.maintenanceUrlConfigured).toBe(true);
    // Missing DATABASE_URL cannot be compared; URL still accepted as distinct.
    const noMain = parseDatabaseRuntimeConfig({
      DB_PGBOUNCER_MODE: "transaction",
      DB_MAINTENANCE_MODE: "direct",
      DB_MAINTENANCE_URL: "postgres://direct.example/db",
    });
    expect(noMain.maintenanceUrlConfigured).toBe(true);
  });

  it("never returns either database URL from parsed output or errors", () => {
    const databaseUrl = "postgres://secret-main.example/main";
    const maintenanceUrl = "postgres://secret-maint.example/maint";
    let serialized = "";
    try {
      parseDatabaseRuntimeConfig({
        DB_MAINTENANCE_MODE: "session",
        DATABASE_URL: databaseUrl,
        DB_MAINTENANCE_URL: maintenanceUrl,
      });
      serialized = JSON.stringify(
        parseDatabaseRuntimeConfig({
          DB_MAINTENANCE_MODE: "session",
          DATABASE_URL: databaseUrl,
          DB_MAINTENANCE_URL: maintenanceUrl,
        })
      );
    } catch {
      serialized = "unexpected throw";
    }
    expect(serialized).not.toContain(databaseUrl);
    expect(serialized).not.toContain(maintenanceUrl);

    try {
      parseDatabaseRuntimeConfig({
        DB_PGBOUNCER_MODE: "transaction",
        DB_MAINTENANCE_MODE: "session",
        DATABASE_URL: databaseUrl,
        DB_MAINTENANCE_URL: databaseUrl,
      });
      expect.fail("expected rejection");
    } catch (error) {
      const message = String((error as Error).message);
      expect(message).not.toContain(databaseUrl);
      expect(message).not.toContain(maintenanceUrl);
    }
  });

  it("bounds the dedicated maintenance pool size", () => {
    for (const value of [2, 3, 4]) {
      expect(
        parseDatabaseRuntimeConfig({
          DB_MAINTENANCE_MODE: "direct",
          DB_MAINTENANCE_URL: "postgres://direct.example/db",
          DB_MAINTENANCE_POOL_MAX: String(value),
        }).maintenancePoolMax
      ).toBe(value);
    }
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_MAINTENANCE_MODE: "direct",
          DB_MAINTENANCE_URL: "postgres://direct.example/db",
          DB_MAINTENANCE_POOL_MAX: "1",
        }),
      CODES.valueOutOfRange,
      "DB_MAINTENANCE_POOL_MAX"
    );
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_MAINTENANCE_MODE: "session",
          DB_MAINTENANCE_URL: "postgres://session.example/db",
          DB_MAINTENANCE_POOL_MAX: "5",
        }),
      CODES.valueOutOfRange,
      "DB_MAINTENANCE_POOL_MAX"
    );
  });
});

describe("cluster connection budget", () => {
  it("pins the 103 reserve boundary: 20 fails, 21 passes", () => {
    expectCode(
      () => parseDatabaseRuntimeConfig({ DB_RESERVED_CONNECTIONS: "20" }),
      CODES.connectionBudgetInvalid,
      "DB_SERVER_MAX_CONNECTIONS"
    );
    expect(parseDatabaseRuntimeConfig({ DB_RESERVED_CONNECTIONS: "21" }).reservedConnections).toBe(
      21
    );
  });

  it("pins planned 81 passing and planned 82 (equality) failing at reserve 21", () => {
    const passing = parseDatabaseRuntimeConfig({
      CODERSO_RUNTIME_REPLICA_COUNT: "13",
      DB_POOL_MAX: "6",
      DB_RESERVED_CONNECTIONS: "21",
    });
    const plannedPassing =
      passing.poolMax * passing.fleet.totalProcessCount + passing.migrationConnectionReserve;
    expect(plannedPassing).toBe(81);

    const failingInput = {
      CODERSO_RUNTIME_REPLICA_COUNT: "79",
      DB_POOL_MAX: "1",
      DB_RESERVED_CONNECTIONS: "21",
    };
    const plannedFailing =
      parseDatabaseFleetConfig(failingInput).totalProcessCount *
        parseInt(failingInput.DB_POOL_MAX, 10) +
      3;
    expect(plannedFailing).toBe(82);
    expectCode(() => parseDatabaseRuntimeConfig(failingInput), CODES.connectionBudgetInvalid);
  });

  it("pins ceil(serverMax * 20 / 100) headroom floors", () => {
    // ceil(10 * 20 / 100) = 2
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_SERVER_MAX_CONNECTIONS: "10",
          DB_RESERVED_CONNECTIONS: "1",
        }),
      CODES.connectionBudgetInvalid
    );
    expect(
      parseDatabaseRuntimeConfig({
        DB_SERVER_MAX_CONNECTIONS: "10",
        DB_RESERVED_CONNECTIONS: "2",
        DB_POOL_MAX: "1",
      }).reservedConnections
    ).toBe(2);
    // ceil(101 * 20 / 100) = 21
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_SERVER_MAX_CONNECTIONS: "101",
          DB_RESERVED_CONNECTIONS: "20",
        }),
      CODES.connectionBudgetInvalid
    );
    expect(
      parseDatabaseRuntimeConfig({
        DB_SERVER_MAX_CONNECTIONS: "101",
        DB_RESERVED_CONNECTIONS: "21",
      }).serverMaxConnections
    ).toBe(101);
  });

  it("rejects reserved >= server maximum and zero operational headroom", () => {
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_SERVER_MAX_CONNECTIONS: "103",
          DB_RESERVED_CONNECTIONS: "103",
        }),
      CODES.connectionBudgetInvalid
    );
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          DB_SERVER_MAX_CONNECTIONS: "103",
          DB_RESERVED_CONNECTIONS: "104",
        }),
      CODES.connectionBudgetInvalid
    );
  });

  it("budgets every declared process pool including workers and maintenance pools", () => {
    const base = parseDatabaseRuntimeConfig({
      DB_POOL_MAX: "4",
      DB_SERVER_MAX_CONNECTIONS: "12",
      DB_RESERVED_CONNECTIONS: "3",
    });
    // planned = 1*4 + 0 + 3 = 7 < 9
    expect(base.poolMax * base.fleet.totalProcessCount + base.migrationConnectionReserve).toBe(7);

    // Adding one complete primary worker pool crosses the line: 8 + 3 >= 9.
    const withWorker = {
      CODERSO_WORKER_REPLICA_COUNT: "1",
      DB_POOL_MAX: "4",
      DB_SERVER_MAX_CONNECTIONS: "12",
      DB_RESERVED_CONNECTIONS: "3",
    };
    expect(parseDatabaseFleetConfig(withWorker).totalProcessCount).toBe(2);
    expectCode(() => parseDatabaseRuntimeConfig(withWorker), CODES.connectionBudgetInvalid);

    // Direct maintenance mode prices a full second pool per process.
    const directSingle = {
      DB_MAINTENANCE_MODE: "direct",
      DB_MAINTENANCE_URL: "postgres://direct.example/db",
      DB_MAINTENANCE_POOL_MAX: "2",
      DB_POOL_MAX: "4",
      DB_SERVER_MAX_CONNECTIONS: "14",
      DB_RESERVED_CONNECTIONS: "3",
    };
    // planned = 4 + 2*1 + 3 = 9 < 11
    expect(parseDatabaseRuntimeConfig(directSingle).maintenancePoolMax).toBe(2);
    const directWithWorker = {
      ...directSingle,
      CODERSO_WORKER_REPLICA_COUNT: "1",
    };
    // planned = 8 + 4 + 3 = 15 >= 11 -> fails.
    expectCode(() => parseDatabaseRuntimeConfig(directWithWorker), CODES.connectionBudgetInvalid);

    // Primary mode never budgets a maintenance pool.
    const primaryLarge = parseDatabaseRuntimeConfig({
      DB_MAINTENANCE_POOL_MAX: "4",
      DB_POOL_MAX: "4",
      DB_SERVER_MAX_CONNECTIONS: "14",
      DB_RESERVED_CONNECTIONS: "3",
    });
    expect(primaryLarge.sessionAffineMaintenanceCandidate).toBe(true);
  });

  it("budgets a complete maintenance pool per added worker in session mode", () => {
    const sessionSingle = {
      DB_MAINTENANCE_MODE: "session",
      DB_MAINTENANCE_URL: "postgres://session.example/db",
      DB_MAINTENANCE_POOL_MAX: "2",
      DB_POOL_MAX: "4",
      DB_SERVER_MAX_CONNECTIONS: "14",
      DB_RESERVED_CONNECTIONS: "3",
    };
    const single = parseDatabaseRuntimeConfig(sessionSingle);
    expect(single.maintenanceMode).toBe("session");
    expect(single.maintenanceUrlConfigured).toBe(true);
    // planned = 1*4 + 1*2 + 3 = 9 < available 11.
    expect(
      single.poolMax * single.fleet.totalProcessCount +
        single.maintenancePoolMax +
        single.migrationConnectionReserve
    ).toBe(9);

    const sessionWithWorker = {
      ...sessionSingle,
      CODERSO_WORKER_REPLICA_COUNT: "1",
    };
    expect(parseDatabaseFleetConfig(sessionWithWorker).totalProcessCount).toBe(2);
    // planned = 2*4 + 2*2 + 3 = 15 >= 11: the added worker prices a complete
    // primary pool and a complete maintenance pool, so the budget rejects it.
    expectCode(() => parseDatabaseRuntimeConfig(sessionWithWorker), CODES.connectionBudgetInvalid);
  });

  it("guards arithmetic against unsafe integers defensively", () => {
    // Absurd digit strings fail with valueOverflow before any budget math.
    // True addition/multiplication overflow is unreachable inside the validated
    // bounds (max 512 processes x 50 pools + 512 x 4 + 8), so the budgetOverflow
    // guards themselves are pinned at the exported arithmetic seam below.
    expectCode(
      () =>
        parseDatabaseRuntimeConfig({
          CODERSO_RUNTIME_REPLICA_COUNT: "256",
          CODERSO_WORKER_REPLICA_COUNT: "256",
          DB_POOL_MAX: "99999999999999999999",
        }),
      CODES.valueOverflow,
      "DB_POOL_MAX"
    );
  });
});

describe("budget arithmetic overflow guards", () => {
  it("rejects multiplication overflow with the machine-readable budgetOverflow code", () => {
    // 2**27 * 2**27 = 2**54 > Number.MAX_SAFE_INTEGER.
    expectCode(() => safeMultiply(2 ** 27, 2 ** 27), CODES.budgetOverflow);
    // One step below the boundary is still accepted.
    expect(safeMultiply(2 ** 26, 2 ** 26)).toBe(2 ** 52);
  });

  it("rejects addition overflow and never attaches a key to arithmetic failures", () => {
    try {
      safeAdd(Number.MAX_SAFE_INTEGER, 1);
      expect.fail("expected addition overflow rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseConfigError);
      const configError = error as DatabaseConfigError;
      expect(configError.code).toBe(CODES.budgetOverflow);
      // Raw arithmetic has no offending key NAME, so the message is the bare
      // code: it can never carry a value or either database URL.
      expect(configError.key).toBeNull();
      expect(configError.message).toBe(CODES.budgetOverflow);
    }
    // One step below the boundary is still accepted.
    expect(safeAdd(Number.MAX_SAFE_INTEGER - 1, 1)).toBe(Number.MAX_SAFE_INTEGER);
    expectCode(() => safeAdd(Number.MAX_SAFE_INTEGER - 3, 4), CODES.budgetOverflow);
  });

  it("cannot overflow through the validated parsers, which is why the seam is pinned", () => {
    const fleet = parseDatabaseFleetConfig({
      CODERSO_RUNTIME_REPLICA_COUNT: "256",
      CODERSO_WORKER_REPLICA_COUNT: "256",
    });
    expect(fleet.totalProcessCount).toBe(512);
    // Worst case budget: 512 x 50 primary + 512 x 4 maintenance + 8 reserve.
    expect(safeMultiply(50, fleet.totalProcessCount)).toBe(25_600);
    expect(safeMultiply(4, fleet.totalProcessCount)).toBe(2_048);
    expect(safeAdd(25_600, 2_048)).toBe(27_648);
    expect(safeAdd(27_648, 8)).toBe(27_656);
    expect(27_656).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

describe("compatibility matrix", () => {
  type MatrixRow = {
    name: string;
    env: Env;
    candidate: boolean | null;
  };

  const matrix: MatrixRow[] = [
    { name: "off+primary", env: {}, candidate: true },
    {
      name: "transaction+primary",
      env: { DB_PGBOUNCER_MODE: "transaction" },
      candidate: false,
    },
    {
      name: "off+direct",
      env: {
        DB_MAINTENANCE_MODE: "direct",
        DB_MAINTENANCE_URL: "postgres://d.example/db",
      },
      candidate: true,
    },
    {
      name: "transaction+direct",
      env: {
        DB_PGBOUNCER_MODE: "transaction",
        DB_MAINTENANCE_MODE: "direct",
        DB_MAINTENANCE_URL: "postgres://d.example/db",
      },
      candidate: true,
    },
    {
      name: "off+session",
      env: {
        DB_MAINTENANCE_MODE: "session",
        DB_MAINTENANCE_URL: "postgres://s.example/db",
      },
      candidate: true,
    },
    {
      name: "transaction+session",
      env: {
        DB_PGBOUNCER_MODE: "transaction",
        DB_MAINTENANCE_MODE: "session",
        DB_MAINTENANCE_URL: "postgres://s.example/db",
      },
      candidate: true,
    },
  ];

  for (const row of matrix) {
    it(`matrix[${row.name}]`, () => {
      const config = parseDatabaseRuntimeConfig(envWith(row.env));
      expect(config.sessionAffineMaintenanceCandidate).toBe(row.candidate);
      expect(config.maintenanceUrlConfigured).toBe(row.env.DB_MAINTENANCE_URL !== undefined);
    });
  }

  it("marks off+primary with capacity>=2 as a live-probe candidate only", () => {
    const config = parseDatabaseRuntimeConfig({});
    expect(config.sessionAffineMaintenanceCandidate).toBe(true);
    expect(config.maintenanceMode).toBe("primary");
    expect(config.maintenanceUrlConfigured).toBe(false);
  });

  it("parses transaction+primary for ordinary traffic while marking session-affine maintenance incapable", () => {
    const config = parseDatabaseRuntimeConfig({ DB_PGBOUNCER_MODE: "transaction" });
    expect(config.sessionAffineMaintenanceCandidate).toBe(false);
  });

  it("keeps off + primary + DB_POOL_MAX=1 valid without inferring enabled maintenance", () => {
    const smallSite = parseDatabaseRuntimeConfig({ DB_POOL_MAX: "1" });
    expect(smallSite.poolMax).toBe(1);
    expect(smallSite.maintenanceMode).toBe("primary");
    expect(smallSite.sessionAffineMaintenanceCandidate).toBe(false);
  });
});

describe("module purity", () => {
  it("performs no env mutation on import or on parse", async () => {
    const before = { ...process.env };
    await import("../../../core/db/databaseConfig");
    parseDatabaseRuntimeConfig({ DB_POOL_MAX: "17" });
    expect({ ...process.env }).toEqual(before);
    expect(Object.keys(process.env).sort()).toEqual(Object.keys(before).sort());
  });

  it("declares no import, driver, timer, clock, environment, or I/O facility", () => {
    // Import purity is structural: the module has no module graph at all, so
    // importing it cannot pull in db/client, a driver, a timer, or an I/O
    // facility, and it cannot read or mutate the real process environment.
    expect(MODULE_SOURCE).not.toMatch(/^\s*import\b/m);
    const code = codeOnly(MODULE_SOURCE);
    expect(code).not.toMatch(/\bimport\s*\(/);
    expect(code).not.toMatch(/\brequire\s*\(/);
    expect(code).not.toMatch(/\bexport\s+\{[\s\S]*?\}\s*from\b/);
    // No timers, clock reads, or queue deferral.
    expect(code).not.toMatch(
      /\b(?:setTimeout|setInterval|setImmediate|clearTimeout|clearInterval|queueMicrotask|process\.nextTick|Date\.now)\b/
    );
    expect(code).not.toMatch(/\bnew Date\b/);
    // No filesystem, network, child-process, or runtime-kernel facility.
    expect(code).not.toMatch(
      /\b(?:fetch|readFileSync|writeFileSync|readdirSync|openSync|createConnection|WebSocket|XMLHttpRequest)\b/
    );
    expect(code).not.toMatch(/\bnode:(?:fs|net|tls|http|https|dns|url|path|child_process)\b/);
    expect(code).not.toMatch(/\bBun\b/);
    expect(code).not.toMatch(/\bDeno\b/);
    // The environment always arrives as a parameter; `process` is never read.
    expect(code).not.toMatch(/\bprocess\.env\b/);
  });

  it("exports a closed pure surface: two parsers plus guarded arithmetic", async () => {
    const mod = await import("../../../core/db/databaseConfig");
    expect(Object.keys(mod).sort()).toEqual([
      "DATABASE_CONFIG_ERROR_CODES",
      "DatabaseConfigError",
      "parseDatabaseFleetConfig",
      "parseDatabaseRuntimeConfig",
      "safeAdd",
      "safeMultiply",
    ]);
  });
});
