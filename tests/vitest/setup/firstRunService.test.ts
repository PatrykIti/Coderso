import { afterEach, expect, test, vi } from "vitest";

// Mirrors tests/vitest/customScreens/customScreenService.test.ts: a fully mocked
// `core/db/client` so this Vitest suite never opens a DB connection. The shared
// remote Postgres is NEVER touched — the empty-table and count-N cases are
// exercised exclusively via the controllable mock aggregate.
const mockDb = vi.hoisted(() => {
  const state = {
    count: 0 as number,
    fromCalls: 0,
    selectArg: null as unknown,
  };

  return {
    state,
    reset() {
      state.count = 0;
      state.fromCalls = 0;
      state.selectArg = null;
    },
    db: {
      select: vi.fn((arg: unknown) => {
        mockDb.state.selectArg = arg;
        return {
          from: vi.fn(async () => {
            mockDb.state.fromCalls += 1;
            return [{ count: mockDb.state.count }];
          }),
        };
      }),
    },
  };
});

vi.mock("../../../core/db/client", () => ({
  db: mockDb.db,
}));

import { countUsers, isFirstRun } from "../../../core/services/admin/firstRunService";

afterEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
});

test("countUsers returns 0 and isFirstRun is true for an empty users table", async () => {
  mockDb.state.count = 0;
  expect(await countUsers()).toBe(0);
  expect(await isFirstRun()).toBe(true);
});

test("countUsers returns the seeded count and isFirstRun is false when a user exists", async () => {
  mockDb.state.count = 1;
  expect(await countUsers()).toBe(1);
  expect(await isFirstRun()).toBe(false);
});

test("isFirstRun is false for larger counts", async () => {
  mockDb.state.count = 5;
  expect(await countUsers()).toBe(5);
  expect(await isFirstRun()).toBe(false);
});

test("countUsers issues a single count(*) aggregate, not an O(rows) list", async () => {
  mockDb.state.count = 3;
  await countUsers();
  // exactly one round-trip through the query builder
  expect(mockDb.db.select).toHaveBeenCalledTimes(1);
  expect(mockDb.state.fromCalls).toBe(1);
  // and it selects an aggregate `count` projection, not `select *`
  expect(mockDb.state.selectArg).toHaveProperty("count");
});

test("countUsers coerces a nullish aggregate row to 0", async () => {
  // simulate a driver returning [] (no row)
  mockDb.db.select.mockImplementationOnce(() => ({
    from: vi.fn(async () => [] as Array<{ count: number }>),
  }));
  expect(await countUsers()).toBe(0);
  expect(await isFirstRun()).toBe(true);
});
