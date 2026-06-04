import { resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";

import {
  STARTUP_MIGRATIONS_ENV,
  STARTUP_MIGRATIONS_FOLDER_ENV,
  resolveStartupMigrationDecision,
  resolveStartupMigrationsFolder,
  runStartupMigrations,
  runWithStartupMigrationLock,
  type StartupMigrationFn,
  type StartupMigrationInput,
} from "../../../core/server/startupMigrations";

function createLogger() {
  return {
    error: vi.fn<(message: string) => void>(),
    log: vi.fn<(message: string) => void>(),
  };
}

describe("resolveStartupMigrationDecision", () => {
  test("enables startup migrations by default", () => {
    expect(resolveStartupMigrationDecision({})).toEqual({
      enabled: true,
      reason: "default_enabled",
    });
  });

  test("disables startup migrations for explicit opt-out values", () => {
    for (const value of ["0", "false", "FALSE", "no", "off", "skip", "disabled"]) {
      expect(
        resolveStartupMigrationDecision({
          [STARTUP_MIGRATIONS_ENV]: value,
        })
      ).toEqual({
        enabled: false,
        reason: `${STARTUP_MIGRATIONS_ENV}=${value.toLowerCase()}`,
      });
    }
  });

  test("keeps migrations enabled for non-opt-out values", () => {
    expect(
      resolveStartupMigrationDecision({
        [STARTUP_MIGRATIONS_ENV]: "true",
      })
    ).toEqual({
      enabled: true,
      reason: `${STARTUP_MIGRATIONS_ENV}=true`,
    });
  });
});

describe("resolveStartupMigrationsFolder", () => {
  test("uses the core migrations directory by default", () => {
    const folder = resolveStartupMigrationsFolder({}, "/tmp/ignored");

    expect(folder.endsWith("core/db/migrations")).toBe(true);
  });

  test("resolves a configured relative folder from the process cwd", () => {
    const folder = resolveStartupMigrationsFolder(
      {
        [STARTUP_MIGRATIONS_FOLDER_ENV]: "custom/migrations",
      },
      "/app/core"
    );

    expect(folder).toBe(resolve("/app/core", "custom/migrations"));
  });
});

describe("runStartupMigrations", () => {
  test("skips the migrator when startup migrations are disabled", async () => {
    const logger = createLogger();
    const migrate: StartupMigrationFn = vi.fn(async () => {});

    const result = await runStartupMigrations({
      env: {
        [STARTUP_MIGRATIONS_ENV]: "false",
      },
      logger,
      migrate,
    });

    expect(result).toEqual({
      ran: false,
      reason: `${STARTUP_MIGRATIONS_ENV}=false`,
    });
    expect(migrate).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      `[startup] Database migrations skipped (${STARTUP_MIGRATIONS_ENV}=false)`
    );
  });

  test("requires DATABASE_URL before running enabled migrations", async () => {
    const logger = createLogger();
    const migrate: StartupMigrationFn = vi.fn(async () => {});

    await expect(
      runStartupMigrations({
        env: {},
        logger,
        migrate,
      })
    ).rejects.toThrow("startup_migrations_database_url_missing");

    expect(migrate).not.toHaveBeenCalled();
  });

  test("runs the injected migrator with the resolved database and folder", async () => {
    const logger = createLogger();
    const calls: StartupMigrationInput[] = [];
    const migrate: StartupMigrationFn = async (input) => {
      calls.push(input);
    };

    const result = await runStartupMigrations({
      cwd: "/app/core",
      env: {
        DATABASE_URL: "postgres://coderso:secret@db/coderso",
        [STARTUP_MIGRATIONS_FOLDER_ENV]: "db/migrations",
      },
      logger,
      migrate,
    });

    const migrationsFolder = resolve("/app/core", "db/migrations");

    expect(result).toEqual({ ran: true, migrationsFolder });
    expect(calls).toEqual([
      {
        databaseUrl: "postgres://coderso:secret@db/coderso",
        migrationsFolder,
      },
    ]);
    expect(logger.log).toHaveBeenCalledWith(
      `[startup] Running database migrations from ${migrationsFolder}`
    );
    expect(logger.log).toHaveBeenCalledWith("[startup] Database migrations completed");
  });

  test("redacts DATABASE_URL from migration failure logs", async () => {
    const logger = createLogger();
    const databaseUrl = "postgres://coderso:secret@db/coderso";
    const migrate: StartupMigrationFn = async () => {
      throw new Error(`cannot connect to ${databaseUrl}`);
    };

    await expect(
      runStartupMigrations({
        env: { DATABASE_URL: databaseUrl },
        logger,
        migrate,
      })
    ).rejects.toThrow(`cannot connect to ${databaseUrl}`);

    expect(logger.error).toHaveBeenCalledWith(
      "[startup] Database migrations failed: cannot connect to [redacted]"
    );
  });
});

describe("runWithStartupMigrationLock", () => {
  test("runs the action while the startup migration lock is held", async () => {
    const events: string[] = [];

    const result = await runWithStartupMigrationLock(
      {
        acquire: async () => {
          events.push("acquire");
        },
        release: async () => {
          events.push("release");
        },
      },
      async () => {
        events.push("action");
        return "migrated";
      }
    );

    expect(result).toBe("migrated");
    expect(events).toEqual(["acquire", "action", "release"]);
  });

  test("releases the startup migration lock when the action fails", async () => {
    const events: string[] = [];
    const failure = new Error("migration failed");

    await expect(
      runWithStartupMigrationLock(
        {
          acquire: async () => {
            events.push("acquire");
          },
          release: async () => {
            events.push("release");
          },
        },
        async () => {
          events.push("action");
          throw failure;
        }
      )
    ).rejects.toBe(failure);

    expect(events).toEqual(["acquire", "action", "release"]);
  });

  test("does not hide the migration failure when lock release also fails", async () => {
    const failure = new Error("migration failed");

    await expect(
      runWithStartupMigrationLock(
        {
          acquire: async () => {},
          release: async () => {
            throw new Error("release failed");
          },
        },
        async () => {
          throw failure;
        }
      )
    ).rejects.toBe(failure);
  });
});
