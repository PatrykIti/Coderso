import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_FINGERPRINTS,
  TASK551_QUERY_FINGERPRINTS,
  TASK551_QUERY_FINGERPRINT_DEFINITIONS,
  computeQueryFingerprintRegistryDigest,
} from "../../../core/db/queryFingerprintRegistry";
import {
  MAX_COUNTER_VALUE,
  POOL_CELLS,
  QUERY_CELLS_PER_FINGERPRINT,
  QUERY_DURATION_BUCKET_MAX_MS,
  QUERY_FAMILIES,
  QUERY_OUTCOMES,
  ROWS_RETURNED_BUCKET_MAX,
  POOL_WAIT_BUCKET_MAX_MS,
  POOL_OUTCOMES,
  SaturatingCounterArray,
  classifyQueryOutcomeError,
  createBoundedDatabaseTelemetrySink,
  measureDatabaseQuery,
  toPoolWaitBucket,
  toQueryDurationBucket,
  toRowsReturnedBucket,
} from "../../../core/db/queryTelemetry";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

describe("queryFingerprintRegistry", () => {
  it("exposes a closed, duplicate-free key/value registry", () => {
    const keys = Object.keys(TASK551_QUERY_FINGERPRINTS);
    expect(new Set(keys).size).toBe(keys.length);
    const values = Object.values(TASK551_QUERY_FINGERPRINTS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("pins every digest as a lowercase SHA-256 with a closed source class", () => {
    for (const definition of Object.values(TASK551_QUERY_FINGERPRINT_DEFINITIONS)) {
      expect(definition.normalizedQuerySha256.length).toBeGreaterThan(0);
      for (const digest of definition.normalizedQuerySha256) {
        expect(digest).toMatch(SHA256_PATTERN);
      }
      expect([
        "application",
        "migration",
        "maintenance",
        "external_diagnostic",
        "unknown",
      ]).toContain(definition.sourceClass);
    }
  });

  it("exports no statement text: values are canonical key strings only", () => {
    for (const [key, value] of Object.entries(TASK551_QUERY_FINGERPRINTS)) {
      expect(value).toBe(key);
    }
  });

  it("is deterministic across imports", () => {
    expect(computeQueryFingerprintRegistryDigest()).toBe(computeQueryFingerprintRegistryDigest());
  });

  it("pins the reviewed receipt size inside the corrected cap", () => {
    // Contract correction of 2026-08-26: the reviewed TASK-551-01 receipt
    // holds exactly 1,065 keys; the ceiling is 2,048 with headroom and module
    // evaluation now fails closed above it.
    expect(Object.keys(TASK551_QUERY_FINGERPRINTS)).toHaveLength(1065);
    expect(Object.keys(TASK551_QUERY_FINGERPRINTS).length).toBeLessThanOrEqual(
      MAX_QUERY_FINGERPRINTS
    );
  });
});

describe("bounded telemetry sink", () => {
  it("rejects unknown enums/fingerprints without allocating counters", () => {
    const sink = createBoundedDatabaseTelemetrySink();
    sink.observeQuery({
      family: "point",
      fingerprint: "not-a-registered-key" as never,
      outcome: "success",
      durationBucket: 0,
      rowsReturnedBucket: 0,
    });
    sink.observeQuery({
      family: "not-a-family" as never,
      fingerprint: Object.keys(TASK551_QUERY_FINGERPRINTS)[0]!,
      outcome: "success",
      durationBucket: 0,
      rowsReturnedBucket: 0,
    });
    expect(sink.snapshot()).toEqual({ queries: [], pool: [] });
  });

  it("aggregates counts into fixed buckets and resets deterministically", () => {
    const sink = createBoundedDatabaseTelemetrySink();
    const key = Object.keys(TASK551_QUERY_FINGERPRINTS)[0]!;
    for (let i = 0; i < 3; i += 1) {
      sink.observeQuery({
        family: "point",
        fingerprint: key,
        outcome: "success",
        durationBucket: toQueryDurationBucket(3),
        rowsReturnedBucket: toRowsReturnedBucket(5),
      });
    }
    sink.observePool({ outcome: "saturated", waitBucket: toPoolWaitBucket(1500) });
    const snapshot = sink.snapshot();
    expect(snapshot.queries).toHaveLength(1);
    expect(snapshot.queries[0]).toMatchObject({
      family: "point",
      fingerprint: key,
      outcome: "success",
      count: 3,
    });
    expect(snapshot.pool).toHaveLength(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    sink.reset();
    expect(sink.snapshot()).toEqual({ queries: [], pool: [] });
  });

  it("pins the exact bucket registries from the contract", () => {
    expect(QUERY_DURATION_BUCKET_MAX_MS).toEqual([
      1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 15000,
    ]);
    expect(ROWS_RETURNED_BUCKET_MAX).toEqual([0, 1, 10, 50, 100, 500, 1000, 10000]);
    expect(POOL_WAIT_BUCKET_MAX_MS).toEqual([1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000]);
    expect([...QUERY_FAMILIES]).toHaveLength(6);
    expect([...QUERY_OUTCOMES]).toHaveLength(5);
    expect([...POOL_OUTCOMES]).toHaveLength(4);
  });

  it("never lets a throwing sink replace the operation value or error", async () => {
    const throwingSink = {
      observeQuery() {
        throw new Error("sentinel-sink-failure");
      },
      observePool() {
        throw new Error("sentinel-sink-failure");
      },
      snapshot() {
        throw new Error("sentinel-sink-failure");
      },
      reset() {
        throw new Error("sentinel-sink-failure");
      },
    };
    const value = await measureDatabaseQuery(
      {
        family: "point",
        fingerprint: Object.keys(TASK551_QUERY_FINGERPRINTS)[0]!,
        run: async () => "ok",
        rowsReturned: () => 1,
      },
      throwingSink
    );
    expect(value).toBe("ok");
    await expect(
      measureDatabaseQuery(
        {
          family: "point",
          fingerprint: Object.keys(TASK551_QUERY_FINGERPRINTS)[0]!,
          run: async () => {
            throw new Error("domain-boom");
          },
        },
        throwingSink
      )
    ).rejects.toThrowError("domain-boom");
  });
});

describe("bounded telemetry storage bounds", () => {
  it("pins the exact contracted cell cardinalities", () => {
    expect(QUERY_CELLS_PER_FINGERPRINT).toBe(6 * 5 * 12 * 9);
    expect(QUERY_CELLS_PER_FINGERPRINT).toBe(3_240);
    expect(POOL_CELLS).toBe(11 * 4);
    expect(POOL_CELLS).toBe(44);
  });

  it("keeps storage fixed regardless of how many samples are observed", () => {
    const array = new SaturatingCounterArray(POOL_CELLS);
    for (let i = 0; i < 20_000; i += 1) {
      array.increment(i % POOL_CELLS);
    }
    expect(array.length).toBe(POOL_CELLS);
    expect(array.get(0)).toBe(Math.ceil(20_000 / POOL_CELLS));

    const sink = createBoundedDatabaseTelemetrySink();
    const key = Object.keys(TASK551_QUERY_FINGERPRINTS)[0]!;
    for (let family = 0; family < QUERY_FAMILIES.length; family += 1) {
      for (let outcome = 0; outcome < QUERY_OUTCOMES.length; outcome += 1) {
        for (let duration = 0; duration < 12; duration += 1) {
          for (let rows = 0; rows < 9; rows += 1) {
            sink.observeQuery({
              family: QUERY_FAMILIES[family]!,
              fingerprint: key,
              outcome: QUERY_OUTCOMES[outcome]!,
              durationBucket: duration,
              rowsReturnedBucket: rows,
            });
          }
        }
      }
    }
    const snapshot = sink.snapshot();
    // One aggregate per non-zero cell of the one touched fingerprint: the
    // snapshot can never exceed the fixed cell budget.
    expect(snapshot.queries.length).toBeLessThanOrEqual(QUERY_CELLS_PER_FINGERPRINT);
    expect(snapshot.pool.length).toBeLessThanOrEqual(POOL_CELLS);
    expect(Object.isFrozen(snapshot.queries)).toBe(true);
    expect(Object.isFrozen(snapshot.pool)).toBe(true);
  });

  it("saturates counters at MAX_COUNTER_VALUE instead of overflowing", () => {
    const array = new SaturatingCounterArray(2);
    array.add(0, MAX_COUNTER_VALUE);
    expect(array.get(0)).toBe(MAX_COUNTER_VALUE);
    array.add(0, MAX_COUNTER_VALUE);
    array.increment(0);
    expect(array.get(0)).toBe(MAX_COUNTER_VALUE);
    array.add(1, 5);
    expect(array.get(1)).toBe(5);
  });

  it("reset() zeroes cells in place without replacing the sink or registry", () => {
    const sink = createBoundedDatabaseTelemetrySink();
    const keysBefore = Object.keys(TASK551_QUERY_FINGERPRINTS);
    const key = keysBefore[0]!;
    sink.observePool({ outcome: "timeout", waitBucket: toPoolWaitBucket(2_000) });
    sink.observeQuery({
      family: "list",
      fingerprint: key,
      outcome: "timeout",
      durationBucket: toQueryDurationBucket(15_000),
      rowsReturnedBucket: 0,
    });
    expect(sink.snapshot().pool).toHaveLength(1);
    sink.reset();
    expect(sink.snapshot()).toEqual({ queries: [], pool: [] });
    // Storage still functions after the in-place reset, and the registry the
    // sink was built over is untouched.
    sink.observeQuery({
      family: "list",
      fingerprint: key,
      outcome: "timeout",
      durationBucket: toQueryDurationBucket(15_000),
      rowsReturnedBucket: 0,
    });
    expect(sink.snapshot().queries).toHaveLength(1);
    expect(sink.snapshot().queries[0]).toMatchObject({ count: 1, fingerprint: key });
    expect(Object.keys(TASK551_QUERY_FINGERPRINTS)).toEqual(keysBefore);
  });
});

describe("measureDatabaseQuery outcome classification", () => {
  const key = Object.keys(TASK551_QUERY_FINGERPRINTS)[0]!;

  it("classifies timeout, cancelled, and driver errors onto the closed registry", () => {
    expect(
      classifyQueryOutcomeError(new Error("canceling statement due to statement_timeout"))
    ).toBe("timeout");
    expect(classifyQueryOutcomeError({ code: "query_canceled" })).toBe("timeout");
    expect(classifyQueryOutcomeError(new Error("operation aborted by caller"))).toBe("cancelled");
    expect(classifyQueryOutcomeError(new Error("connection terminated unexpectedly"))).toBe(
      "cancelled"
    );
    expect(classifyQueryOutcomeError(new Error("relation does not exist"))).toBe("driver_error");
    expect(classifyQueryOutcomeError("plain string failure")).toBe("driver_error");
  });

  it("records the timeout outcome with the zero rows bucket", async () => {
    const sink = createBoundedDatabaseTelemetrySink();
    await expect(
      measureDatabaseQuery(
        {
          family: "search",
          fingerprint: key,
          run: async () => {
            throw new Error("canceling statement due to statement_timeout");
          },
          rowsReturned: () => 999,
        },
        sink
      )
    ).rejects.toThrowError("statement_timeout");
    expect(sink.snapshot().queries).toEqual([
      {
        family: "search",
        fingerprint: key,
        outcome: "timeout",
        durationBucket: expect.any(Number),
        rowsReturnedBucket: 0,
        count: 1,
      },
    ]);
  });

  it("records the returned-row bucket from the trusted callback", async () => {
    const sink = createBoundedDatabaseTelemetrySink();
    const sentinel = "sentinel-secret-sql-bind";
    const result = await measureDatabaseQuery(
      {
        family: "list",
        fingerprint: key,
        run: async () => sentinel.length,
        rowsReturned: (length) => length * 1_000, // far above the top row bucket.
      },
      sink
    );
    expect(result).toBe(sentinel.length);
    expect(sink.snapshot().queries).toHaveLength(1);
    expect(sink.snapshot().queries[0]).toMatchObject({
      family: "list",
      outcome: "success",
      rowsReturnedBucket: toRowsReturnedBucket(sentinel.length * 1_000),
    });
  });

  it("never stores a secret sentinel from results or error messages", async () => {
    const sink = createBoundedDatabaseTelemetrySink();
    const secret = "postgres://task551:super-secret@db.invalid:5432/coderso";
    await measureDatabaseQuery(
      { family: "point", fingerprint: key, run: async () => secret },
      sink
    );
    await expect(
      measureDatabaseQuery(
        {
          family: "point",
          fingerprint: key,
          run: async () => {
            throw new Error(`connect failed for ${secret}`);
          },
        },
        sink
      )
    ).rejects.toThrowError();
    const serialized = JSON.stringify(sink.snapshot());
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("db.invalid");
    expect(serialized).not.toContain("connect failed");
  });
});

describe("side-effect-free import", () => {
  it("imports both registry modules without env or database contact", async () => {
    // This dynamic import cannot pin first evaluation: the static import at
    // the top of this file already evaluated both modules. What it pins is
    // instance identity — both entry points resolve to one shared,
    // already-evaluated module pair, so no second evaluation or repeated
    // module side effect can run.
    const registry = await import("../../../core/db/queryFingerprintRegistry");
    const telemetry = await import("../../../core/db/queryTelemetry");
    expect(typeof registry.computeQueryFingerprintRegistryDigest()).toBe("string");
    expect(typeof telemetry.databaseTelemetry.snapshot()).toBe("object");
    expect(registry.TASK551_QUERY_FINGERPRINTS).toBe(TASK551_QUERY_FINGERPRINTS);
  });

  it("pins that no runtime module under core/ imports from tests/", () => {
    const root = fileURLToPath(new URL("../../../", import.meta.url));
    const skip = new Set(["node_modules", "dist", ".git", "coverage", ".tmp"]);
    const offending: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        if (entry.startsWith(".")) continue;
        const full = join(dir, entry);
        let stats;
        try {
          stats = statSync(full);
        } catch {
          continue;
        }
        if (stats.isDirectory()) {
          if (!skip.has(entry)) walk(full);
          continue;
        }
        if (!entry.endsWith(".ts")) continue;
        const source = readFileSync(full, "utf8");
        const specifiers = [...source.matchAll(/(?:from|import)\s*\(?["']([^"']+)["']/gu)].map(
          (match) => match[1]!
        );
        if (specifiers.some((specifier) => /(?:^|\/)tests\//.test(specifier))) {
          offending.push(full);
        }
      }
    };
    // The runtime bundle is core/: a tests/ import there would ship test code
    // to production. (The TASK-551-01 baseline *scripts* intentionally read the
    // shared pinned fixtures under tests/perf/fixtures; they are offline CLIs,
    // never part of the server bundle.)
    walk(join(root, "core"));
    expect(offending).toEqual([]);
  });

  it("recomputes the registry digest from sorted keys independently", () => {
    // Independent recomputation of the digest recipe: sorted registry keys,
    // each rendered as `key->digest1,digest2`, joined with newlines, hashed
    // with SHA-256 right here instead of calling back into the module under
    // test.
    const canonical = Object.keys(TASK551_QUERY_FINGERPRINT_DEFINITIONS)
      .sort()
      .map(
        (key) =>
          `${key}->${TASK551_QUERY_FINGERPRINT_DEFINITIONS[key]!.normalizedQuerySha256.join(",")}`
      )
      .join("\n");
    const recomputed = createHash("sha256").update(canonical).digest("hex");
    expect(recomputed).toMatch(SHA256_PATTERN);
    // The canonical digest is stable across repeated computation in-process.
    const first = computeQueryFingerprintRegistryDigest();
    expect(computeQueryFingerprintRegistryDigest()).toBe(first);
    expect(first).toBe(recomputed);
  });
});
