import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildDatabaseApplicationName,
  parseDatabaseApplicationIdentity,
  DatabaseApplicationIdentityError,
} from "../../../core/db/databaseApplicationIdentity";
import { parseDatabaseFleetConfig } from "../../../core/db/databaseConfig";

const defaultFleet = parseDatabaseFleetConfig({});

describe("parseDatabaseApplicationIdentity", () => {
  it("defaults to runtime/replica-1 for the default local fleet", () => {
    const identity = parseDatabaseApplicationIdentity({}, defaultFleet);
    expect(identity).toEqual({ processKind: "runtime", replicaId: "replica-1" });
  });

  it("rejects the default replica ID for any non-default fleet", () => {
    const fleet = parseDatabaseFleetConfig({
      CODERSO_RUNTIME_REPLICA_COUNT: "2",
    });
    expect(() => parseDatabaseApplicationIdentity({}, fleet)).toThrowError(
      DatabaseApplicationIdentityError
    );
  });

  it("requires workerProcessCount >= 1 for kind=worker", () => {
    expect(() =>
      parseDatabaseApplicationIdentity({ CODERSO_DB_PROCESS_KIND: "worker" }, defaultFleet)
    ).toThrowError(DatabaseApplicationIdentityError);
  });

  it("accepts a worker identity on a fleet with workers", () => {
    const fleet = parseDatabaseFleetConfig({
      CODERSO_WORKER_REPLICA_COUNT: "2",
      CODERSO_DB_REPLICA_ID: "worker-a",
    });
    const identity = parseDatabaseApplicationIdentity(
      { CODERSO_DB_PROCESS_KIND: "worker", CODERSO_DB_REPLICA_ID: "worker-a" },
      fleet
    );
    expect(identity.processKind).toBe("worker");
    expect(identity.replicaId).toBe("worker-a");
  });

  it("rejects unknown kinds, case variants, whitespace, and bad grammar", () => {
    const bad = ["Runtime", "runtime ", "scheduler", ""];
    for (const value of bad) {
      expect(() =>
        parseDatabaseApplicationIdentity({ CODERSO_DB_PROCESS_KIND: value }, defaultFleet)
      ).toThrowError(DatabaseApplicationIdentityError);
    }
    const badIds = ["Replica-1", " replica-1", "-abc", "a".repeat(33), "ab_c"];
    for (const value of badIds) {
      expect(() =>
        parseDatabaseApplicationIdentity({ CODERSO_DB_REPLICA_ID: value }, defaultFleet)
      ).toThrowError(DatabaseApplicationIdentityError);
    }
  });

  it("rejects unknown CODERSO_DB_* keys", () => {
    expect(() =>
      parseDatabaseApplicationIdentity({ CODERSO_DB_REGION: "eu" }, defaultFleet)
    ).toThrowError(DatabaseApplicationIdentityError);
  });
});

describe("buildDatabaseApplicationName", () => {
  it.each([
    ["runtime", "replica-1", "coderso:runtime:replica-1"],
    ["worker", "worker-a", "coderso:worker:worker-a"],
    ["maintenance", "replica-1", "coderso:maintenance:replica-1"],
  ] as const)("renders %s names", (kind, id, expected) => {
    expect(buildDatabaseApplicationName(kind, id)).toBe(expected);
  });

  it("renders migration names only from a canonical lowercase UUID", () => {
    const uuid = "0b9e6c1e-7f2a-4c3d-9a1b-2f3e4d5c6b7a";
    expect(buildDatabaseApplicationName("migration", uuid)).toBe(`coderso:migration:${uuid}`);
    expect(() => buildDatabaseApplicationName("migration", "Not-A-Uuid")).toThrowError(
      DatabaseApplicationIdentityError
    );
  });

  it("keeps every grammar-valid name within the 63-byte ceiling", () => {
    // Longest grammar-valid replica ID (32 chars) plus the longest prefix.
    const longest = buildDatabaseApplicationName("maintenance", "a".repeat(32));
    expect(longest.length).toBeLessThanOrEqual(63);
    expect(longest).toMatch(/^[\x20-\x7e]+$/);
    // The builder still fails closed on any identity that would overflow.
    expect(() => buildDatabaseApplicationName("runtime", "a".repeat(40))).toThrowError(
      DatabaseApplicationIdentityError
    );
    // Longest grammar-valid ID renders unchanged.
    expect(buildDatabaseApplicationName("runtime", "a".repeat(32))).toBe(
      `coderso:runtime:${"a".repeat(32)}`
    );
  });
});

describe("identity against fleet boundaries", () => {
  it("accepts the exact fleet count ranges (runtime 1..256, worker 0..256)", () => {
    expect(parseDatabaseFleetConfig({ CODERSO_RUNTIME_REPLICA_COUNT: "1" })).toEqual({
      runtimeProcessCount: 1,
      workerProcessCount: 0,
      totalProcessCount: 1,
    });
    expect(
      parseDatabaseFleetConfig({ CODERSO_RUNTIME_REPLICA_COUNT: "256" }).runtimeProcessCount
    ).toBe(256);
    expect(
      parseDatabaseFleetConfig({
        CODERSO_RUNTIME_REPLICA_COUNT: "256",
        CODERSO_WORKER_REPLICA_COUNT: "256",
      }).totalProcessCount
    ).toBe(512);
    expect(
      parseDatabaseFleetConfig({ CODERSO_WORKER_REPLICA_COUNT: "256" }).workerProcessCount
    ).toBe(256);
    // Out-of-bounds declarations fail closed.
    for (const env of [
      { CODERSO_RUNTIME_REPLICA_COUNT: "0" },
      { CODERSO_RUNTIME_REPLICA_COUNT: "257" },
      { CODERSO_WORKER_REPLICA_COUNT: "257" },
      { CODERSO_WORKER_REPLICA_COUNT: "-1" },
    ]) {
      expect(() => parseDatabaseFleetConfig(env)).toThrowError();
    }
  });

  it("produces exactly the { processKind, replicaId } pair and nothing else", () => {
    const fleet = parseDatabaseFleetConfig({
      CODERSO_WORKER_REPLICA_COUNT: "2",
      CODERSO_DB_REPLICA_ID: "worker-a",
    });
    const identity = parseDatabaseApplicationIdentity(
      { CODERSO_DB_PROCESS_KIND: "worker", CODERSO_DB_REPLICA_ID: "worker-a" },
      fleet
    );
    expect(identity).toEqual({ processKind: "worker", replicaId: "worker-a" });
    expect(Object.keys(identity).sort()).toEqual(["processKind", "replicaId"]);
    expect(buildDatabaseApplicationName(identity.processKind, identity.replicaId)).toBe(
      "coderso:worker:worker-a"
    );
  });

  it("never surfaces connection URLs or credentials in the identity or name", () => {
    const identity = parseDatabaseApplicationIdentity(
      {
        DATABASE_URL: "postgres://runtime:runtime-secret@db.invalid:5432/coderso",
        DB_MAINTENANCE_URL: "postgres://maintenance:maintenance-secret@db.invalid:5432/coderso",
      },
      defaultFleet
    );
    expect(identity).toEqual({ processKind: "runtime", replicaId: "replica-1" });
    const serialized = JSON.stringify([
      identity,
      buildDatabaseApplicationName(identity.processKind, identity.replicaId),
      buildDatabaseApplicationName("maintenance", identity.replicaId),
    ]);
    expect(serialized).not.toContain("postgres://");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("db.invalid");
  });
});

describe("side-effect-free import", () => {
  it("pins that the identity module opens no database client", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../../../core/db/databaseApplicationIdentity.ts", import.meta.url)),
      "utf8"
    );
    expect(source).not.toMatch(/from\s+"postgres"/);
    expect(source).not.toMatch(/from\s+"\.\/client"/);
    expect(source).not.toMatch(/from\s+"\.\/databaseLifecycle"/);
    expect(source).not.toMatch(/\bpostgres\s*\(/);
    expect(source).not.toMatch(/\bnew\s+Pool\b/);
    expect(source).not.toMatch(/\bprocess\.env\.DATABASE_URL\b/);
    // Evaluation is a pure parse of the passed environment record.
    expect(parseDatabaseApplicationIdentity({}, defaultFleet)).toEqual({
      processKind: "runtime",
      replicaId: "replica-1",
    });
  });
});
