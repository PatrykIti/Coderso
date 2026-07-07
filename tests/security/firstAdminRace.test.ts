import { expect, test } from "bun:test";

import { roles, users } from "../../core/db/schema";
import { createFirstAdmin } from "../../core/services/admin/firstRunService";

// Hermetic + shared-DB-safe: the race runs entirely against an in-memory seam
// injected via CreateFirstAdminDeps. It NEVER touches the shared remote Postgres
// `users` table and asserts only the fixture's own count. PII keys are set so
// `buildEmailFields` resolves without depending on the ambient environment.
process.env.PII_HASH_KEY ??= "0".repeat(64);
process.env.PII_ENC_KEY ??= "1".repeat(64);

type Store = {
  users: Array<Record<string, unknown>>;
  roles: Array<Record<string, unknown>>;
};

function makeTx(store: Store) {
  return {
    execute: async () => {},
    select: () => ({
      from: (table: unknown) => ({
        where: async () => (table === roles ? store.roles : []),
      }),
    }),
    insert: (table: unknown) => ({
      values: (vals: Record<string, unknown>) => ({
        returning: async () => {
          if (table === roles) {
            const row = { id: `role-${store.roles.length + 1}`, ...vals };
            store.roles.push(row);
            return [row];
          }
          if (table === users) {
            const row = { id: `user-${store.users.length + 1}`, ...vals };
            store.users.push(row);
            return [row];
          }
          return [];
        },
        onConflictDoNothing: async () => {},
      }),
    }),
  };
}

/**
 * Models `pg_advisory_xact_lock`: transaction bodies are serialized on a single
 * chain so that at most one runs its count-recheck + insert at a time. Without
 * this serialization (i.e. relying on READ COMMITTED alone), two callers with
 * DIFFERENT emails would both read count=0 and both insert.
 */
function makeSeam() {
  const store: Store = { users: [], roles: [] };
  let chain: Promise<unknown> = Promise.resolve();
  const db = {
    transaction: (fn: (tx: ReturnType<typeof makeTx>) => unknown) => {
      const run = chain.then(() => fn(makeTx(store)));
      chain = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
  return { store, db };
}

test("two concurrent installers with different emails ⇒ exactly one admin", async () => {
  const { store, db } = makeSeam();
  const deps = {
    db: db as never,
    isFirstRun: async () => store.users.length === 0,
    countUsersTx: async () => store.users.length,
    hashPassword: async (password: string) => `hash:${password}`,
  };

  const results = await Promise.allSettled([
    createFirstAdmin({ name: "Alice", email: "alice@example.com", password: "password123" }, deps),
    createFirstAdmin({ name: "Bob", email: "bob@example.com", password: "password123" }, deps),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  expect(fulfilled).toHaveLength(1);
  expect(rejected).toHaveLength(1);
  expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(Error);
  expect(((rejected[0] as PromiseRejectedResult).reason as Error).message).toBe(
    "first_run_unavailable"
  );
  // Scoped to the fixture — never a global count against the shared DB.
  expect(store.users).toHaveLength(1);
});

test("the winning admin is active with the ['*'] role", async () => {
  const { store, db } = makeSeam();
  const deps = {
    db: db as never,
    isFirstRun: async () => store.users.length === 0,
    countUsersTx: async () => store.users.length,
    hashPassword: async (password: string) => `hash:${password}`,
  };

  await Promise.allSettled([
    createFirstAdmin({ name: "Alice", email: "alice@example.com", password: "password123" }, deps),
    createFirstAdmin({ name: "Bob", email: "bob@example.com", password: "password123" }, deps),
  ]);

  expect(store.users).toHaveLength(1);
  expect(store.users[0]?.status).toBe("active");
  expect(store.roles).toHaveLength(1);
  expect(store.roles[0]?.permissions).toEqual(["*"]);
});
