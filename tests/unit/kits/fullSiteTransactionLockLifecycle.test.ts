import { expect, test } from "bun:test";

import {
  runFullSiteInstallTransactionLockLifecycle,
  type FullSiteInstallTransactionLock,
  type FullSiteInstallTransactionLockRuntime,
} from "../../../core/services/kits/legacyInstallRunPersistence";

type LockFailure = { at: "global" | "package"; error: Error } | null;

const createRuntime = (
  events: string[],
  endClient: () => Promise<void> = async () => undefined,
  lockFailure: LockFailure = null
): FullSiteInstallTransactionLockRuntime => ({
  async runTransaction<T>(execute: (lock: FullSiteInstallTransactionLock) => Promise<T>) {
    events.push("transaction:start");
    try {
      const value = await execute({
        acquireGlobal: async () => {
          events.push("lock:global");
          if (lockFailure?.at === "global") throw lockFailure.error;
        },
        acquirePackage: async () => {
          events.push("lock:package");
          if (lockFailure?.at === "package") throw lockFailure.error;
        },
      });
      events.push("transaction:commit");
      return value;
    } catch (error) {
      events.push("transaction:rollback");
      throw error;
    }
  },
  async endClient() {
    events.push("client:end");
    await endClient();
  },
});

test("keeps both transaction-scoped locks around the complete callback", async () => {
  const events: string[] = [];
  await expect(
    runFullSiteInstallTransactionLockLifecycle(createRuntime(events), async () => {
      events.push("callback");
      return "done";
    })
  ).resolves.toBe("done");
  expect(events).toEqual([
    "transaction:start",
    "lock:global",
    "lock:package",
    "callback",
    "transaction:commit",
    "client:end",
  ]);
});

test("preserves the callback failure when closing the lock client also fails", async () => {
  const events: string[] = [];
  const callbackError = new Error("callback_failed");
  const closeError = new Error("client_end_failed");
  const outcome = runFullSiteInstallTransactionLockLifecycle(
    createRuntime(events, async () => {
      throw closeError;
    }),
    async () => {
      events.push("callback");
      throw callbackError;
    }
  ).then(
    () => null,
    (error: unknown) => error
  );

  await expect(outcome).resolves.toBe(callbackError);
  expect(events).toEqual([
    "transaction:start",
    "lock:global",
    "lock:package",
    "callback",
    "transaction:rollback",
    "client:end",
  ]);
});

test("rolls back every acquisition failure and keeps it authoritative over close failure", async () => {
  for (const at of ["global", "package"] as const) {
    const events: string[] = [];
    const lockError = new Error(`${at}_lock_failed`);
    const closeError = new Error("client_end_failed");
    let callbackCalled = false;
    const outcome = runFullSiteInstallTransactionLockLifecycle(
      createRuntime(
        events,
        async () => {
          throw closeError;
        },
        { at, error: lockError }
      ),
      async () => {
        callbackCalled = true;
      }
    ).then(
      () => null,
      (error: unknown) => error
    );

    await expect(outcome).resolves.toBe(lockError);
    expect(callbackCalled).toBe(false);
    expect(events).toEqual([
      "transaction:start",
      "lock:global",
      ...(at === "package" ? ["lock:package"] : []),
      "transaction:rollback",
      "client:end",
    ]);
  }
});

test("surfaces a client close failure after a successful transaction", async () => {
  const closeError = new Error("client_end_failed");
  await expect(
    runFullSiteInstallTransactionLockLifecycle(
      createRuntime([], async () => {
        throw closeError;
      }),
      async () => "done"
    )
  ).rejects.toBe(closeError);
});
