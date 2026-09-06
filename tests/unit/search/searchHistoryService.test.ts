// Two-tier unit suite for the rewritten search-history write API
// (TASK-551-06-L01).
//
// Airtight validation legs run against a non-routable DATABASE_URL, so a green
// run proves the exercised paths executed zero SQL: the transitional string
// branch is non-mutating by contract, and every command rejection is raised
// before any statement is issued — a stray statement would surface as a driver
// connection error whose message is never one of the stable codes.
//
// The restored `listRecentSearches` legs are airtight the same way: they route
// the service's module-bound `db` at a driver-accurate in-memory postgres.js
// fake through the swappable module stub below, so real drizzle builds the real
// bounded-read statement and the fake hands back seeded rows without dialing.
//
// Persistence/replay semantics need a real database. Those legs register
// through `testIfDb` on the owner-injected `task551-db-test` map below and
// skip when the map is absent, exactly like tests/unit/access/accessLogService.test.ts.

import { afterAll, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import {
  SearchHistoryContractError,
  parseSearchHistoryWriteRequest,
} from "../../../core/services/search/searchHistoryContract";
import type { SearchHistoryWriteCommand } from "../../../core/services/search/searchHistoryContract";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map:
 * the exact-own child fixture map (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`,
 * `_SENTINEL`) plus fixed OS keys, with no inherited environment. The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Under the airtight local form no
 * key is set, so the real-database legs below skip by name instead of dialing
 * an ambient URL. Mirrors tests/perf/database-pool-telemetry.test.ts.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

/** The owner map is the only real-database source; nothing else is dialed. */
const OWNER_FIXTURE_DATABASE_URL = OWNER_DB_TEST_MAP_PRESENT
  ? (process.env.TASK551_FIXTURE_DATABASE_URL as string)
  : null;

type ClientModule = typeof import("../../../core/db/client");
type SchemaModule = typeof import("../../../core/db/schema");
type ServiceModule = typeof import("../../../core/services/search/searchHistoryService");

/**
 * The database client binds its pools when the module evaluates, so the owner
 * override must exist before that import and the whole DB-touching graph is
 * therefore loaded lazily. Without the owner map the graph still has to
 * evaluate for the DB-free legs, so the mandate's non-routable probe URL is
 * installed as a load-time sentinel: postgres.js connects lazily and every
 * dialing leg is gated behind `OWNER_DB_TEST_MAP_PRESENT`, so the sentinel is
 * never queried.
 */
const DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY = "task551DatabaseClientRuntimeOverrideForTests";
const MODULE_LOAD_SENTINEL_DATABASE_URL = "postgresql://127.0.0.1:1/none";

/**
 * The service binds its `db` when it evaluates, so the read legs below
 * re-register the client module through `mock.module` with a proxy whose target
 * is swappable per leg: the real pool for the owner-map legs, the in-memory
 * driver fake for the bounded-read legs. `mock.module` copies the factory
 * result once, so the proxy (not a getter) is what keeps the binding live, and
 * outside a swap window it forwards to the real pool so the shared `bun test`
 * lanes keep the production client.
 */
let swappableDatabase: ClientModule["db"] | null = null;

const SWAPPABLE_DATABASE = new Proxy({} as ClientModule["db"], {
  get: (_target, property) => {
    const current = swappableDatabase as ClientModule["db"];
    const value = Reflect.get(current, property, current);
    return typeof value === "function" ? value.bind(current) : value;
  },
  set: (_target, property, value) => {
    const current = swappableDatabase as ClientModule["db"];
    Reflect.set(current, property, value);
    return true;
  },
});

/** Registers the swappable client module once, before the service evaluates. */
const installSwappableDatabaseModule = (realClient: ClientModule): void => {
  swappableDatabase = realClient.db;
  mock.module("../../../core/db/client", () => ({ ...realClient, db: SWAPPABLE_DATABASE }));
};

/** Routes the service's module-bound `db` at `replacement` for one leg. */
async function withSwappableDatabase<T>(
  replacement: ClientModule["db"],
  run: () => Promise<T>
): Promise<T> {
  const production = swappableDatabase as ClientModule["db"];
  swappableDatabase = replacement;
  try {
    return await run();
  } finally {
    swappableDatabase = production;
  }
}

let client: ClientModule;
let schemaModule: SchemaModule;
let service: ServiceModule;
let db: ClientModule["db"];
let searchHistory: SchemaModule["searchHistory"];
let users: SchemaModule["users"];

/**
 * Stable failure codes, rebound from the live service export once the module
 * graph loads. They start as the doc-pinned literals so the code-string pin
 * below is meaningful even before any leg awaits `loadModules`.
 */
let invalid = "search_history_invalid";
let idempotencyRequired = "search_history_idempotency_required";
let idempotencyConflict = "search_history_idempotency_conflict";

const loadModules = async (): Promise<ServiceModule> => {
  if (service) return service;
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY] = {
    databaseUrl: OWNER_FIXTURE_DATABASE_URL ?? MODULE_LOAD_SENTINEL_DATABASE_URL,
  };
  client = (await import("../../../core/db/client")) as ClientModule;
  const schema = (await import("../../../core/db/schema")) as SchemaModule;
  searchHistory = schema.searchHistory;
  users = schema.users;
  schemaModule = schema;
  db = client.db;
  // Re-register the client module after the real bindings are captured and
  // before the service evaluates, so the service's `db` is the swappable proxy
  // that defaults to the real pool.
  installSwappableDatabaseModule(client);
  service = (await import("../../../core/services/search/searchHistoryService")) as ServiceModule;
  ({ idempotencyConflict, idempotencyRequired, invalid } =
    service.SEARCH_HISTORY_SERVICE_ERROR_CODES);
  return service;
};

// Named gate: the real-database arms register through `test.skipIf` on the
// owner map above and skip when it is absent.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

let userIds: string[] = [];

afterAll(async () => {
  if (!service) return;
  if (userIds.length > 0) {
    // search_history.user_id cascades on user delete, so every recorded row
    // written by the DB legs is removed with its owner.
    await db.delete(users).where(inArray(users.id, userIds));
  }
  client.setDatabaseClientRuntimeForTests(null);
});

const ACTOR = "1f0c4d3e-8f2a-4c1b-9a7e-1b2c3d4e5f60";

type CommandShape = {
  query: string;
  filters: { limit: number; dateRange: string };
  idempotencyKey: string;
};

const baseCommand = (overrides: Partial<CommandShape> = {}): CommandShape => ({
  query: "drizzle retention",
  filters: { limit: 10, dateRange: "last-7-days" },
  idempotencyKey: "2c5c67af-9e5a-4f0e-8f5c-6d7b8a9c0d1e",
  ...overrides,
});

/** A hand-built command the service accepts, typed as the strict shape. */
const serviceCommand = (overrides: Partial<CommandShape> = {}): SearchHistoryWriteCommand =>
  baseCommand(overrides) as unknown as SearchHistoryWriteCommand;

const withoutKey = (command: CommandShape, key: keyof CommandShape): Record<string, unknown> => {
  const clone: Record<string, unknown> = { ...command };
  delete clone[key];
  return clone;
};

/** Rejects must carry the stable code and must precede any SQL statement. */
async function expectRejection(
  command: unknown,
  code: string,
  actor: string = ACTOR
): Promise<void> {
  const { recordSearch } = await loadModules();
  let caught: unknown = null;
  try {
    await recordSearch(actor, command as never);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error | null)?.message).toBe(code);
}

/** Reads every history row written for one DB-leg user, oldest insert first. */
async function selectHistoryRows(userId: string) {
  return db
    .select({ query: searchHistory.query, filters: searchHistory.filters })
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId));
}

/** Seeds one disposable owner; deleting it cascades every recorded row away. */
async function seedUser(tag: string): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({
      email: `search-history-${tag}-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: `Search History ${tag}`,
      status: "active",
    })
    .returning({ id: users.id });
  userIds.push(user.id);
  return user.id;
}

/** One seeded recent-read row, exactly as the driver delivers it (string ts). */
type SeededRecentRow = { query: string; createdAt: string };

/**
 * Driver-accurate fake for the bounded recent read: postgres.js exposes
 * `unsafe(sql, params)` whose result carries a positional `.values()`, so real
 * drizzle builds the real statement against this fake and nothing dials. The
 * fake honors the pinned `order by "search_history"."created_at" desc` by
 * returning the seeded rows newest-first.
 */
const makeBoundedReadStub = (
  seedRows: readonly SeededRecentRow[]
): { statements: { sql: string; params: unknown[] }[]; stubDb: ClientModule["db"] } => {
  const statements: { sql: string; params: unknown[] }[] = [];
  const fakeClient = {
    options: { parsers: {}, serializers: {} },
    unsafe(sqlText: string, params: unknown[]) {
      statements.push({ sql: sqlText, params: [...params] });
      const newestFirst = [...seedRows].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
      );
      const values = newestFirst.map((row) => [row.query, row.createdAt]);
      return { values: async () => values };
    },
  };
  return {
    statements,
    stubDb: drizzle(fakeClient as never, { schema: schemaModule }) as ClientModule["db"],
  };
};

/** Seeds one recent-read row at a distinct UTC instant of one fixed day. */
const recentRow = (query: string, offsetMinutes: number): SeededRecentRow => {
  // The driver hands back a zone-less `timestamp` literal and drizzle appends
  // the UTC offset while mapping, so the fake emits exactly that wire format.
  const wallClock = new Date(Date.UTC(2026, 0, 1, 0, offsetMinutes));
  return {
    query,
    createdAt: wallClock.toISOString().slice(0, 19).replace("T", " "),
  };
};

describe("recordSearch transitional string branch", () => {
  test("records nothing for plain string input", async () => {
    const { recordSearch } = await loadModules();
    const result = await recordSearch(ACTOR, "hello world");
    expect(result).toEqual({ recorded: false });
  });

  test("records nothing with legacy filters attached", async () => {
    const { recordSearch } = await loadModules();
    const result = await recordSearch(ACTOR, "hello world", { limit: 10 });
    expect(result).toEqual({ recorded: false });
  });

  test("does not validate the actor on the zero-SQL branch", async () => {
    const { recordSearch } = await loadModules();
    const result = await recordSearch("not-an-actor", "hello world");
    expect(result).toEqual({ recorded: false });
  });
});

describe("recordSearch command validation", () => {
  test("rejects a non-canonical actor before reading the command", async () => {
    await expectRejection(baseCommand(), invalid, "not-a-uuid");
    await expectRejection(baseCommand(), invalid, "");
    await expectRejection(baseCommand(), invalid, "1F0C4D3E-8F2A-4C1B-9A7E-1B2C3D4E5F60");
  });

  test("rejects non-object commands", async () => {
    await expectRejection(null, invalid);
    await expectRejection(undefined, invalid);
    await expectRejection([baseCommand()], invalid);
    await expectRejection(42, invalid);
  });

  test("rejects unknown and missing top-level keys", async () => {
    await expectRejection({ ...baseCommand(), extra: 1 }, invalid);
    await expectRejection(withoutKey(baseCommand(), "query"), invalid);
    await expectRejection(withoutKey(baseCommand(), "filters"), invalid);
    await expectRejection(withoutKey(baseCommand(), "idempotencyKey"), idempotencyRequired);
  });

  test("rejects out-of-bounds or non-string query text", async () => {
    await expectRejection(baseCommand({ query: "a" }), invalid);
    await expectRejection(baseCommand({ query: "a".repeat(201) }), invalid);
    await expectRejection(baseCommand({ query: 42 as never }), invalid);
  });

  test("rejects malformed filters shapes and values", async () => {
    await expectRejection({ ...baseCommand(), filters: null }, invalid);
    await expectRejection({ ...baseCommand(), filters: { limit: 10 } }, invalid);
    await expectRejection(
      { ...baseCommand(), filters: { limit: 10, dateRange: "last-7-days", extra: true } },
      invalid
    );
    await expectRejection(
      baseCommand({ filters: { limit: 0, dateRange: "last-7-days" } }),
      invalid
    );
    await expectRejection(
      baseCommand({ filters: { limit: 51, dateRange: "last-7-days" } }),
      invalid
    );
    await expectRejection(
      baseCommand({ filters: { limit: 1.5, dateRange: "last-7-days" } }),
      invalid
    );
    await expectRejection(
      baseCommand({ filters: { limit: "10" as never, dateRange: "last-7-days" } }),
      invalid
    );
    await expectRejection(baseCommand({ filters: { limit: 10, dateRange: "yesterday" } }), invalid);
  });

  test("requires an idempotency key before validating its syntax", async () => {
    await expectRejection(baseCommand({ idempotencyKey: "" }), idempotencyRequired);
    await expectRejection(baseCommand({ idempotencyKey: 42 as never }), idempotencyRequired);
    await expectRejection(baseCommand({ idempotencyKey: "not-a-uuid" }), invalid);
    await expectRejection(
      baseCommand({ idempotencyKey: "2C5C67AF-9E5A-4F0E-8F5C-6D7B8A9C0D1E" }),
      invalid
    );
  });

  test("pins the conflict code for the strict-path replay guard", async () => {
    // The conflict outcome itself needs a database; the code string is the
    // DB-free half of that contract.
    await loadModules();
    expect(idempotencyConflict).toBe("search_history_idempotency_conflict");
  });
});

describe("recordSearch boundary normalization (TASK-551-06-L01 A5)", () => {
  test("normalizes the raw query before enforcing the 2..200 bound", async () => {
    // A raw query far above 200 that collapses to a legal canonical text must
    // pass the query bound. The empty idempotency key is the next gate in the
    // boundary's fixed check order and carries its own code, which proves the
    // bound was passed rather than skipped.
    await expectRejection(
      baseCommand({
        query: `${" ".repeat(300)}drizzle retention${" ".repeat(300)}`,
        idempotencyKey: "",
      }),
      idempotencyRequired
    );
    // A raw query inside the raw bound that collapses below the minimum still
    // fails the canonical bound instead of being accepted on raw length.
    await expectRejection(baseCommand({ query: " ".repeat(50) }), invalid);
    await expectRejection(baseCommand({ query: "   a   " }), invalid);
    await expectRejection(baseCommand({ query: "\n\t a \n" }), invalid);
  });

  test("mirrors the contract owner's normalization through both entry points", async () => {
    const key = baseCommand().idempotencyKey;
    // Raw inputs the contract owner accepts after trim plus whitespace
    // collapse: the service boundary must accept the identical raw text, and
    // both must agree on the canonical result.
    const acceptedRaw = [
      "  drizzle   retention  ",
      "drizzle\t\n retention",
      `${" ".repeat(120)}drizzle retention${" ".repeat(120)}`,
    ];
    for (const raw of acceptedRaw) {
      const viaContract = parseSearchHistoryWriteRequest({
        query: raw,
        limit: 10,
        dateRange: "last-7-days",
        idempotencyKey: key,
      });
      expect(viaContract.query).toBe("drizzle retention");
      // Service side: acceptance past the query bound surfaces as the next
      // gate's code (empty key), never as search_history_invalid.
      await expectRejection(baseCommand({ query: raw, idempotencyKey: "" }), idempotencyRequired);
    }

    // Raw inputs the contract owner rejects must be rejected with the
    // identical code at the service boundary.
    const rejectedRaw = [" a ", " ".repeat(50), "\n\t a \n", "a".repeat(201), " ".repeat(201)];
    for (const raw of rejectedRaw) {
      let contractCode: string | null = null;
      try {
        parseSearchHistoryWriteRequest({
          query: raw,
          limit: 10,
          dateRange: "last-7-days",
          idempotencyKey: key,
        });
      } catch (error) {
        contractCode = error instanceof SearchHistoryContractError ? error.code : null;
      }
      expect(contractCode).toBe(invalid);
      await expectRejection(baseCommand({ query: raw }), invalid);
    }
  });
});

describe("listRecentSearches bounded recent read (TASK-551-06-L01)", () => {
  test("returns at most the newest 10 unique queries, deduplicated newest-first", async () => {
    const { listRecentSearches } = await loadModules();
    // Distinct keys may append duplicate query text now that the latest-query
    // preflight read is gone, so the same text recurs at several instants and
    // the read must collapse each text to its newest occurrence.
    const seeded: SeededRecentRow[] = [
      recentRow("hello world", 1),
      ...Array.from({ length: 10 }, (_item, index) => recentRow(`query-${index}`, index + 2)),
      recentRow("overflow-0", 12),
      recentRow("overflow-1", 13),
      recentRow("query-3", 14),
      recentRow("hello world", 15),
    ];
    const { stubDb } = makeBoundedReadStub(seeded);
    const recent = await withSwappableDatabase(stubDb, () => listRecentSearches(ACTOR, 10));
    // Restored legs from the pre-rewrite suite, same meaning.
    expect(recent.length).toBeLessThanOrEqual(10);
    expect(recent.some((item) => item.query === "hello world")).toBe(true);
    expect(new Set(recent.map((item) => item.query)).size).toBe(recent.length);
    // Stronger: exact newest-first unique order, capped before the dropped tail.
    expect(recent.map((item) => item.query)).toEqual([
      "hello world",
      "query-3",
      "overflow-1",
      "overflow-0",
      "query-9",
      "query-8",
      "query-7",
      "query-6",
      "query-5",
      "query-4",
    ]);
    // The kept occurrence of duplicated text is its newest instant.
    expect(recent[0].createdAt.toISOString()).toBe(
      new Date(Date.UTC(2026, 0, 1, 0, 15)).toISOString()
    );
  });

  test("issues exactly one bounded per-user read and no prune statement", async () => {
    const { listRecentSearches } = await loadModules();
    const { statements, stubDb } = makeBoundedReadStub([recentRow("hello world", 1)]);
    const recent = await withSwappableDatabase(stubDb, () => listRecentSearches(ACTOR, 10));
    expect(recent.map((item) => item.query)).toEqual(["hello world"]);
    // One statement: no latest-query preflight read, no prune on the read path.
    expect(statements).toHaveLength(1);
    const { sql, params } = statements[0];
    expect(sql).toContain('from "search_history"');
    expect(sql).toContain('where "search_history"."user_id" = $1');
    expect(sql).toContain('order by "search_history"."created_at" desc');
    expect(sql).toMatch(/limit \$\d+$/);
    // 50 is the module's bounded fetch window feeding the deduplicating read.
    expect(params).toEqual([ACTOR, 50]);
    expect(/delete|insert|update/i.test(sql)).toBe(false);
  });

  test("honors an explicit smaller caller limit inside the deduplicated window", async () => {
    const { listRecentSearches } = await loadModules();
    const { stubDb } = makeBoundedReadStub([
      recentRow("hello world", 1),
      recentRow("second probe", 5),
      recentRow("third probe", 12),
      recentRow("hello world", 9),
    ]);
    const recent = await withSwappableDatabase(stubDb, () => listRecentSearches(ACTOR, 2));
    expect(recent.map((item) => item.query)).toEqual(["third probe", "hello world"]);
    expect(recent[1].createdAt.toISOString()).toBe(
      new Date(Date.UTC(2026, 0, 1, 0, 9)).toISOString()
    );
  });

  test("defaults the caller limit to the newest 10", async () => {
    const { listRecentSearches } = await loadModules();
    const { stubDb } = makeBoundedReadStub(
      Array.from({ length: 12 }, (_item, index) => recentRow(`distinct-${index}`, index + 1))
    );
    const recent = await withSwappableDatabase(stubDb, () => listRecentSearches(ACTOR));
    expect(recent).toHaveLength(10);
    expect(recent[0].query).toBe("distinct-11");
    expect(recent[9].query).toBe("distinct-2");
  });
});

describe("recordSearch persistence and replay (requires the owner-injected task551-db-test map)", () => {
  testIfDb("padded input stores canonical text and replays via both entry points", async () => {
    const { recordSearch } = await loadModules();
    const userId = await seedUser("padded");
    const key = "3d6c1e21-8a34-4f8e-9f2a-7c1b2d3e4f50";

    // Entry point 1: the route-side contract parser normalizes padded input.
    const viaContract = parseSearchHistoryWriteRequest({
      query: "  drizzle   retention  ",
      limit: 10,
      dateRange: "last-7-days",
      idempotencyKey: key,
    });
    await expect(recordSearch(userId, viaContract)).resolves.toEqual({ recorded: true });

    // Entry point 2: a hand-built command with the same padded raw query must
    // land on the same deterministic id with the same canonical payload, so
    // the replay collapses to a no-op instead of conflicting or appending.
    const viaService = serviceCommand({
      query: "  drizzle   retention  ",
      idempotencyKey: key,
    });
    await expect(recordSearch(userId, viaService)).resolves.toEqual({ recorded: false });

    const rows = await selectHistoryRows(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].query).toBe("drizzle retention");
    expect(rows[0].filters).toEqual({ limit: 10, dateRange: "last-7-days" });
  });

  testIfDb("a raw query above 200 that normalizes shorter is accepted", async () => {
    const { recordSearch } = await loadModules();
    const userId = await seedUser("oversized-raw");
    const padded = `${" ".repeat(300)}drizzle retention${" ".repeat(300)}`;
    expect(padded.length).toBeGreaterThan(200);

    await expect(
      recordSearch(
        userId,
        serviceCommand({ query: padded, idempotencyKey: "4e7d2f32-9b45-4a9f-8a3b-8d2c3e4f5a61" })
      )
    ).resolves.toEqual({ recorded: true });

    const rows = await selectHistoryRows(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].query).toBe("drizzle retention");
  });

  testIfDb("a differing canonical payload on the same actor/key conflicts", async () => {
    const { recordSearch } = await loadModules();
    const userId = await seedUser("conflict");
    const key = "5f8e3a43-ac56-4ba0-9b4c-9e3d4f5a6b72";

    await expect(
      recordSearch(userId, serviceCommand({ query: "first probe", idempotencyKey: key }))
    ).resolves.toEqual({ recorded: true });

    // Same actor/key, different canonical query: the doc pins the conflict to
    // differing canonical payloads only.
    await expectRejection(
      serviceCommand({ query: "second probe", idempotencyKey: key }),
      idempotencyConflict,
      userId
    );

    const rows = await selectHistoryRows(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].query).toBe("first probe");
  });
});

describe("search-history source guards (TASK-551-06-L01)", () => {
  const serviceSource = readFileSync(
    new URL("../../../core/services/search/searchHistoryService.ts", import.meta.url),
    "utf8"
  );

  test("the private pruneHistory helper and its newest-10 call are absent", () => {
    // The leaf removed the private declaration plus the exact
    // `await pruneHistory(userId, DEFAULT_LIMIT)` call from `recordSearch`, so
    // any prune helper spelling on the write service is a regression.
    expect(serviceSource).not.toMatch(/\bpruneHistory\b/);
    expect(serviceSource).not.toMatch(/\bprune[A-Z]/);
  });

  test("imports no retention service and keeps every statement delete-free", () => {
    const specifiers = [...serviceSource.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) {
      expect(specifier.toLowerCase()).not.toContain("retention");
    }
    expect(serviceSource).not.toContain("searchHistoryRetentionService");
    // Physical cleanup belongs to the scheduled retention owner only.
    expect(serviceSource).not.toMatch(/\.delete\(/);
  });
});
