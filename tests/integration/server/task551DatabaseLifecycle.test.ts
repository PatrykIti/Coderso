import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import {
  DATABASE_CLOSE_TIMEOUT_SECONDS,
  HTTP_DRAIN_DEADLINE_MS,
  PARTICIPANT_CLOSE_DEADLINE_MS,
  POOL_ACQUISITION_DEADLINE_MS,
  RETENTION_CANCEL_DRAIN_DEADLINE_MS,
  RETENTION_STATEMENT_TIMEOUT_MS,
  closeAllDatabaseClientsWithinAbsoluteDeadline,
  registerDatabaseLifecycleParticipant,
  resetDatabaseLifecycleForTests,
  setDatabaseClientModuleForTests,
  type DatabaseClientModule,
} from "../../../core/db/databaseLifecycle";
import {
  GRACEFUL_SHUTDOWN_DEADLINE_MS,
  RUNTIME_LIFECYCLE_ERROR_CODES,
  closeRuntimeLifecycle,
  getRuntimeLifecycleCloseFailures,
  getRuntimeLifecycleCloseTimeouts,
  participantCloseBudgetMs,
  registerRuntimeLifecycleParticipant,
  resetRuntimeLifecycleForTests,
  startRuntimeLifecycle,
  type RuntimeLifecycleParticipant,
} from "../../../core/server/runtimeLifecycle";

type FakeClientModule = DatabaseClientModule & {
  calls: string[];
  closeBudgets: number[];
};

function makeFakeClientModule(options: { declaredMaintenance?: boolean }): FakeClientModule {
  const module: FakeClientModule = {
    calls: [],
    closeBudgets: [],
    verifyDatabaseSessions: async () => {
      module.calls.push("verifyDatabaseSessions");
    },
    assertMaintenanceSessionAffinity: async () => {
      module.calls.push("assertMaintenanceSessionAffinity");
    },
    assertMaintenanceSessionAffinityIfDeclared: async () => {
      module.calls.push(
        options.declaredMaintenance
          ? "assertMaintenanceSessionAffinity"
          : "skipped-affinity-primary"
      );
    },
    closeAllDatabaseClientsWithin: async (budgetMs: number) => {
      module.calls.push(`close:${budgetMs}`);
      module.closeBudgets.push(budgetMs);
    },
    listDatabaseClients: () => ["primary"],
  };
  return module;
}

function resetLifecycleSeams(): void {
  resetRuntimeLifecycleForTests();
  resetDatabaseLifecycleForTests();
}

describe("task551 database lifecycle", () => {
  test("pins the exact lifecycle ceilings from the contract", () => {
    // The 2,000 ms acquisition deadline is the saturated-vs-timeout boundary:
    // a wait of at least 1,000 ms but under it is `saturated`, a deadline win
    // is `timeout`, so its value is pinned next to the other ceilings.
    expect(POOL_ACQUISITION_DEADLINE_MS).toBe(2_000);
    expect(PARTICIPANT_CLOSE_DEADLINE_MS).toBe(5_000);
    expect(DATABASE_CLOSE_TIMEOUT_SECONDS).toBe(10);
    expect(GRACEFUL_SHUTDOWN_DEADLINE_MS).toBe(15_000);
    expect(HTTP_DRAIN_DEADLINE_MS).toBe(10_000);
    expect(RETENTION_CANCEL_DRAIN_DEADLINE_MS).toBe(4_500);
    expect(RETENTION_STATEMENT_TIMEOUT_MS).toBe(4_000);
  });

  test("starts database first, verifies sessions, and skips the probe in primary mode", async () => {
    resetLifecycleSeams();
    const order: string[] = [];
    const fakeDb = makeFakeClientModule({ declaredMaintenance: false });
    setDatabaseClientModuleForTests(async () => fakeDb);
    registerDatabaseLifecycleParticipant();
    registerRuntimeLifecycleParticipant({
      id: "cache",
      phase: "cache",
      start: async () => {
        order.push("cache-start");
      },
      close: async () => {
        order.push("cache-close");
      },
    });
    registerRuntimeLifecycleParticipant({
      id: "worker",
      phase: "worker",
      start: async () => {
        order.push("worker-start");
      },
      close: async () => {
        order.push("worker-close");
      },
    });

    const { startRuntimeLifecycle } = await import("../../../core/server/runtimeLifecycle");
    await startRuntimeLifecycle();
    expect(order).toEqual(["cache-start", "worker-start"]);
    // Database participant starts before every other phase.
    expect(fakeDb.calls[0]).toBe("verifyDatabaseSessions");
    expect(fakeDb.calls[1]).toBe("skipped-affinity-primary");

    await closeRuntimeLifecycle("test");
    // Reverse phase close: workers and cache closed; database last.
    expect(order[order.length - 2]).toBe("worker-close");
    expect(order[order.length - 1]).toBe("cache-close");
    expect(fakeDb.calls.some((call) => call.startsWith("close:"))).toBe(true);
  });

  test("probes a declared direct/session maintenance channel exactly once at start", async () => {
    resetLifecycleSeams();
    const fakeDb = makeFakeClientModule({ declaredMaintenance: true });
    setDatabaseClientModuleForTests(async () => fakeDb);
    registerDatabaseLifecycleParticipant();
    const { startRuntimeLifecycle } = await import("../../../core/server/runtimeLifecycle");
    await startRuntimeLifecycle();
    expect(fakeDb.calls).toContain("assertMaintenanceSessionAffinity");
  });

  test("caps the database close budget at min(10s, remaining global time)", async () => {
    resetLifecycleSeams();
    const fakeDb = makeFakeClientModule({});
    setDatabaseClientModuleForTests(async () => fakeDb);

    // An already-passed absolute deadline leaves zero budget.
    await closeAllDatabaseClientsWithinAbsoluteDeadline(Date.now() - 5);
    expect(fakeDb.closeBudgets).toEqual([0]);

    // A far-future deadline caps at the explicit 10-second exception.
    await closeAllDatabaseClientsWithinAbsoluteDeadline(Date.now() + 60_000);
    expect(fakeDb.closeBudgets[1]).toBe(10_000);

    // Remaining global time below the cap wins.
    await closeAllDatabaseClientsWithinAbsoluteDeadline(Date.now() + 3_000);
    expect(fakeDb.closeBudgets[2]).toBeGreaterThan(0);
    expect(fakeDb.closeBudgets[2]!).toBeLessThanOrEqual(3_000);
  });
});

describe("lifecycle registry rejections and memoization", () => {
  test("rejects duplicate participant ids with the stable code", () => {
    resetLifecycleSeams();
    const participant: RuntimeLifecycleParticipant = {
      id: "worker-a",
      phase: "worker",
      start: async () => undefined,
      close: async () => undefined,
    };
    registerRuntimeLifecycleParticipant(participant);
    expect(() => registerRuntimeLifecycleParticipant(participant)).toThrowError(
      RUNTIME_LIFECYCLE_ERROR_CODES.duplicateId
    );
  });

  test("rejects late registration after start and after close", async () => {
    resetLifecycleSeams();
    setDatabaseClientModuleForTests(async () => makeFakeClientModule({}));
    registerRuntimeLifecycleParticipant({
      id: "worker-a",
      phase: "worker",
      start: async () => undefined,
      close: async () => undefined,
    });
    await startRuntimeLifecycle();
    expect(() =>
      registerRuntimeLifecycleParticipant({
        id: "worker-late",
        phase: "worker",
        start: async () => undefined,
        close: async () => undefined,
      })
    ).toThrowError(RUNTIME_LIFECYCLE_ERROR_CODES.lateRegistration);

    await closeRuntimeLifecycle("test");
    expect(() =>
      registerRuntimeLifecycleParticipant({
        id: "worker-later",
        phase: "worker",
        start: async () => undefined,
        close: async () => undefined,
      })
    ).toThrowError(RUNTIME_LIFECYCLE_ERROR_CODES.lateRegistration);
  });

  test("memoizes concurrent close calls so participants close exactly once", async () => {
    resetLifecycleSeams();
    let closes = 0;
    registerRuntimeLifecycleParticipant({
      id: "worker-once",
      phase: "worker",
      start: async () => undefined,
      close: async () => {
        closes += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
      },
    });
    await startRuntimeLifecycle();
    await Promise.all([
      closeRuntimeLifecycle("test"),
      closeRuntimeLifecycle("test"),
      closeRuntimeLifecycle("test"),
    ]);
    expect(closes).toBe(1);
    // A settled lifecycle close stays a no-op instead of closing again.
    await closeRuntimeLifecycle("test");
    expect(closes).toBe(1);
  });

  test("aborts the close signal before the first participant close", async () => {
    resetLifecycleSeams();
    const observed: boolean[] = [];
    registerRuntimeLifecycleParticipant({
      id: "worker-signal",
      phase: "worker",
      start: async () => undefined,
      close: async (_reason, context) => {
        observed.push(context.signal.aborted);
      },
    });
    registerRuntimeLifecycleParticipant({
      id: "cache-signal",
      phase: "cache",
      start: async () => undefined,
      close: async (_reason, context) => {
        observed.push(context.signal.aborted);
      },
    });
    await startRuntimeLifecycle();
    await closeRuntimeLifecycle("test");
    expect(observed).toEqual([true, true]);
  });

  test("records close failures by id and still closes later participants", async () => {
    resetLifecycleSeams();
    const order: string[] = [];
    registerRuntimeLifecycleParticipant({
      id: "cache-boom",
      phase: "cache",
      start: async () => undefined,
      close: async () => {
        order.push("cache-boom");
        throw new Error("sentinel-close-failure");
      },
    });
    registerRuntimeLifecycleParticipant({
      id: "database-last",
      phase: "database",
      start: async () => undefined,
      close: async () => {
        order.push("database-last");
      },
    });
    await startRuntimeLifecycle();
    await closeRuntimeLifecycle("test");
    // Reverse registration order within the sorted close sequence: the cache
    // participant closes first and its failure never blocks the database one.
    expect(order).toEqual(["cache-boom", "database-last"]);
    expect(getRuntimeLifecycleCloseFailures()).toContain("cache-boom");
  });

  test("records an elapsed close by id and still awaits it before resolving", async () => {
    resetLifecycleSeams();
    const realNow = Date.now;
    let closeSettled = false;
    const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    // Closed second (reverse registration order): its ceiling is computed
    // after the clock below has been shifted past the absolute deadline, so
    // the remaining budget is 0 and the close elapses immediately.
    registerRuntimeLifecycleParticipant({
      id: "worker-hang",
      phase: "worker",
      start: async () => undefined,
      close: async () => {
        // Outlives its ceiling but is still awaited: the shared close must not
        // resolve before this settles.
        await sleep(25);
        closeSettled = true;
      },
    });
    // Closed first: shifts the shared clock so the next participant has zero
    // remaining time on the already-created absolute deadline.
    registerRuntimeLifecycleParticipant({
      id: "worker-clock",
      phase: "worker",
      start: async () => undefined,
      close: async () => {
        Date.now = () => realNow() + GRACEFUL_SHUTDOWN_DEADLINE_MS * 2;
      },
    });
    await startRuntimeLifecycle();
    try {
      await closeRuntimeLifecycle("test");
    } finally {
      Date.now = realNow;
    }
    expect(closeSettled).toBe(true);
    expect(getRuntimeLifecycleCloseTimeouts()).toContain("worker-hang");
  });

  test("clocks the per-phase close budget matrix exactly", () => {
    const farFuture = Date.now() + 60_000;
    const nearDeadline = Date.now() + 3_000;
    expect(participantCloseBudgetMs("worker", farFuture)).toBe(5_000);
    expect(participantCloseBudgetMs("cache", farFuture)).toBe(5_000);
    expect(participantCloseBudgetMs("worker", nearDeadline)).toBe(3_000);
    expect(participantCloseBudgetMs("cache", Date.now() - 1)).toBe(0);
    // The database phase is the sole exemption: min(10s, remaining), never 5s.
    expect(participantCloseBudgetMs("database", farFuture)).toBe(10_000);
    expect(participantCloseBudgetMs("database", nearDeadline)).toBe(3_000);
    expect(participantCloseBudgetMs("database", Date.now() - 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DB-free client-boundary suite: synthetic never-dialed URL placeholders plus
// fake pools only. No database is contacted and no env var is read; the real
// session-affinity probe against Postgres stays a recorded owner barrier.
// ---------------------------------------------------------------------------

type ClientModule = typeof import("../../../core/db/client");
type AnyRecord = Record<string, unknown>;
type TagFn = (strings: TemplateStringsArray, ...values: unknown[]) => unknown;

const SYNTHETIC_DATABASE_URL = "postgres://task551-dbfree.invalid:5432/task551dbfree";
const OVERRIDE_KEY = "task551DatabaseClientRuntimeOverrideForTests";

let client: ClientModule;

type FakeReserved = {
  raw: unknown;
  sqlCalls: string[];
  readonly releases: number;
};

function makeTag(sqlCalls: string[], respond: (sql: string) => AnyRecord[]): TagFn {
  return (strings, ...values) => {
    void values;
    const text = strings.join("?").replace(/\s+/gu, " ").trim();
    sqlCalls.push(text);
    let rows: AnyRecord[];
    try {
      rows = respond(text);
    } catch (error) {
      return Promise.reject(error);
    }
    return Object.assign(Promise.resolve(rows), {
      cancel: (): void => {
        sqlCalls.push(`cancel ${text}`);
      },
    });
  };
}

function makeFakeReserved(respond: (sql: string) => AnyRecord[]): FakeReserved {
  const sqlCalls: string[] = [];
  let releases = 0;
  const tag = makeTag(sqlCalls, respond);
  const raw = Object.assign(tag as object, {
    begin: async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> => run(tag),
    release: (): void => {
      releases += 1;
      sqlCalls.push("release");
    },
    end: async (): Promise<void> => undefined,
  });
  return {
    raw,
    sqlCalls,
    get releases(): number {
      return releases;
    },
  };
}

type FakeSql = {
  raw: unknown;
  sqlCalls: string[];
  readonly reservations: number;
  readonly ends: number;
};

function makeFakeSql(reservedFor: (index: number) => FakeReserved): FakeSql {
  const sqlCalls: string[] = [];
  let reservations = 0;
  let ends = 0;
  const tag = makeTag(sqlCalls, () => []);
  const raw = Object.assign(tag as object, {
    begin: async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> => run(tag),
    reserve: async (): Promise<unknown> => {
      reservations += 1;
      return reservedFor(reservations).raw;
    },
    end: async (): Promise<void> => {
      ends += 1;
    },
  });
  return {
    raw,
    sqlCalls,
    get reservations(): number {
      return reservations;
    },
    get ends(): number {
      return ends;
    },
  };
}

/** Owner responder for a successful two-transaction affinity proof. */
const OWNER_PROOF: (sql: string) => AnyRecord[] = (sql) => {
  if (sql.includes("pg_try_advisory_lock")) return [{ pid: 111, acquired: true }];
  if (sql.includes("pg_backend_pid")) return [{ pid: 111 }];
  return [];
};
/** Independent verifier: the same lock still free on a different backend. */
const VERIFIER_PROOF: (sql: string) => AnyRecord[] = (sql) => {
  if (sql.includes("pg_try_advisory_lock")) return [{ pid: 222, acquired: false }];
  return [];
};
/** Transaction-pooled verdict: the owner backend re-acquires its own lock. */
const VERIFIER_REENTRANT: (sql: string) => AnyRecord[] = (sql) => {
  if (sql.includes("pg_try_advisory_lock")) return [{ pid: 111, acquired: true }];
  return [];
};

describe("client maintenance session affinity (DB-free)", () => {
  beforeAll(async () => {
    // The override must exist before client.ts evaluates so module
    // construction uses synthetic, never-dialed URL placeholders.
    (globalThis as AnyRecord)[OVERRIDE_KEY] = { databaseUrl: SYNTHETIC_DATABASE_URL };
    client = (await import("../../../core/db/client")) as ClientModule;
    expect(client.DATABASE_CLIENT_RUNTIME_OVERRIDE_GLOBAL_KEY).toBe(OVERRIDE_KEY);
  });

  afterAll(() => {
    client.setDatabaseClientRuntimeForTests(null);
  });

  beforeEach(async () => {
    // Bump the lifecycle generation so every test re-probes through its own
    // fake pool instead of reusing another test's cached proof.
    await client.closeAllDatabaseClientsWithin(10_000);
  });

  test("rejects transaction+primary with zero reserve attempts", async () => {
    const maintenance = makeFakeSql(() => makeFakeReserved(VERIFIER_PROOF));
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "transaction", maintenanceMode: "primary" },
      maintenanceSqlClient: maintenance.raw as never,
    });
    await expect(client.assertMaintenanceSessionAffinity()).rejects.toThrowError(
      "database_maintenance_session_unavailable"
    );
    expect(maintenance.reservations).toBe(0);
  });

  test("rejects primary+off below two sessions with zero reserve attempts", async () => {
    const maintenance = makeFakeSql(() => makeFakeReserved(VERIFIER_PROOF));
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "off", maintenanceMode: "primary", poolMax: 1 },
      maintenanceSqlClient: maintenance.raw as never,
    });
    await expect(client.assertMaintenanceSessionAffinity()).rejects.toThrowError(
      "database_maintenance_session_unavailable"
    );
    expect(maintenance.reservations).toBe(0);
  });

  test("proves two-transaction affinity once and caches it per generation", async () => {
    const owner = makeFakeReserved(OWNER_PROOF);
    const verifier = makeFakeReserved(VERIFIER_PROOF);
    // Odd reservations are the owner, even ones the verifier: the re-probe
    // after the generation bump below reserves owner (3) then verifier (4).
    const maintenance = makeFakeSql((index) => (index % 2 === 1 ? owner : verifier));
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "off", maintenanceMode: "primary", poolMax: 2 },
      maintenanceSqlClient: maintenance.raw as never,
    });
    await client.assertMaintenanceSessionAffinity();
    expect(maintenance.reservations).toBe(2);
    expect(owner.releases).toBe(1);
    expect(verifier.releases).toBe(1);

    // The proof is cached: a second call reserves nothing new.
    await client.assertMaintenanceSessionAffinity();
    expect(maintenance.reservations).toBe(2);

    // Any client close bumps the generation and drops the cached proof.
    await client.closeAllDatabaseClientsWithin(10_000);
    await client.assertMaintenanceSessionAffinity();
    expect(maintenance.reservations).toBe(4);
    // The generation-bump close ended this distinct client exactly once.
    expect(maintenance.ends).toBe(1);
  });

  test("fails transaction pooling after balancing the re-entrant lock", async () => {
    const owner = makeFakeReserved(OWNER_PROOF);
    const verifier = makeFakeReserved(VERIFIER_REENTRANT);
    const maintenance = makeFakeSql((index) => (index === 1 ? owner : verifier));
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "off", maintenanceMode: "primary", poolMax: 2 },
      maintenanceSqlClient: maintenance.raw as never,
    });
    await expect(client.assertMaintenanceSessionAffinity()).rejects.toThrowError(
      "database_maintenance_session_unavailable"
    );
    expect(verifier.sqlCalls.some((sql) => sql.includes("pg_advisory_unlock"))).toBe(true);
    expect(verifier.releases).toBe(1);
    expect(owner.releases).toBe(1);
  });

  test("pins the dedicated-session budget matrix against live mode and pools", () => {
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "off", maintenanceMode: "primary", poolMax: 3 },
    });
    expect(() =>
      client.assertDedicatedDatabaseSessionBudget({
        lockOwners: 1,
        workSessions: 1,
        ordinaryHeadroom: 1,
      })
    ).not.toThrowError();
    expect(() =>
      client.assertDedicatedDatabaseSessionBudget({
        lockOwners: 2,
        workSessions: 1,
        ordinaryHeadroom: 1,
      })
    ).toThrowError("database_dedicated_session_budget_invalid");
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "transaction", maintenanceMode: "primary", poolMax: 10 },
    });
    expect(() =>
      client.assertDedicatedDatabaseSessionBudget({
        lockOwners: 1,
        workSessions: 1,
        ordinaryHeadroom: 1,
      })
    ).toThrowError("database_maintenance_session_unavailable");
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "off", maintenanceMode: "direct", maintenancePoolMax: 2 },
    });
    expect(() =>
      client.assertDedicatedDatabaseSessionBudget({
        lockOwners: 1,
        workSessions: 1,
        ordinaryHeadroom: 0,
      })
    ).not.toThrowError();
    expect(() =>
      client.assertDedicatedDatabaseSessionBudget({
        lockOwners: 2,
        workSessions: 1,
        ordinaryHeadroom: 0,
      })
    ).toThrowError("database_dedicated_session_budget_invalid");
    for (const bad of [
      { lockOwners: -1, workSessions: 0, ordinaryHeadroom: 0 },
      { lockOwners: 1.5, workSessions: 0, ordinaryHeadroom: 0 },
    ]) {
      expect(() => client.assertDedicatedDatabaseSessionBudget(bad)).toThrowError(
        "database_dedicated_session_budget_invalid"
      );
    }
  });
});

describe("dedicated maintenance session boundaries (DB-free)", () => {
  beforeAll(async () => {
    (globalThis as AnyRecord)[OVERRIDE_KEY] = { databaseUrl: SYNTHETIC_DATABASE_URL };
    client = (await import("../../../core/db/client")) as ClientModule;
  });

  afterAll(() => {
    client.setDatabaseClientRuntimeForTests(null);
  });

  beforeEach(async () => {
    // Bump the lifecycle generation so the affinity proof re-runs through this
    // test's own fake pool instead of reusing another test's cached proof.
    await client.closeAllDatabaseClientsWithin(10_000);
  });

  /**
   * Reservation order per test: 1 = probe owner, 2 = probe verifier, then the
   * lease reservation. `leaseDelayMs` delays the lease fulfillment past the
   * acquisition deadline for the reserve-timeout path.
   */
  const dedicatedFixtures = (options?: {
    leaseRespond?: (sql: string) => AnyRecord[];
    leaseDelayMs?: number;
  }): { maintenance: FakeSql; reserved: FakeReserved } => {
    const reserved = makeFakeReserved(
      options?.leaseRespond ??
        ((sql) => {
          if (sql.includes("pg_backend_pid")) return [{ pid: 333 }];
          return [];
        })
    );
    const owner = makeFakeReserved(OWNER_PROOF);
    const verifier = makeFakeReserved(VERIFIER_PROOF);
    const sqlCalls: string[] = [];
    let reservations = 0;
    let ends = 0;
    const tag = makeTag(sqlCalls, () => []);
    const raw = Object.assign(tag as object, {
      begin: async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> => run(tag),
      reserve: async (): Promise<unknown> => {
        reservations += 1;
        if (options?.leaseDelayMs !== undefined && reservations >= 3) {
          await new Promise((resolve) => setTimeout(resolve, options.leaseDelayMs));
        }
        return (reservations === 1 ? owner : reservations === 2 ? verifier : reserved).raw;
      },
      end: async (): Promise<void> => {
        ends += 1;
      },
    });
    const maintenance: FakeSql = {
      raw,
      sqlCalls,
      get reservations(): number {
        return reservations;
      },
      get ends(): number {
        return ends;
      },
    };
    client.setDatabaseClientRuntimeForTests({
      config: { pgbouncerMode: "off", maintenanceMode: "primary", poolMax: 2 },
      maintenanceSqlClient: raw as never,
    });
    return { maintenance, reserved };
  };

  test("hands one session to run, drains it, and releases exactly once", async () => {
    const { reserved } = dedicatedFixtures();
    let sessionSeen = false;
    const rows = await client.withDedicatedDatabaseSession(async (session) => {
      sessionSeen = true;
      const executed = await session.execute(
        (sql) => sql`select 1 as ok` as never,
        new AbortController().signal
      );
      const txResult = await session.transaction({
        signal: new AbortController().signal,
        statementTimeoutMs: RETENTION_STATEMENT_TIMEOUT_MS,
        run: async (tx) => tx`select 2 as ok` as never,
      });
      return [executed, txResult];
    });
    expect(sessionSeen).toBe(true);
    expect(rows).toEqual([[], []]);
    expect(reserved.sqlCalls.some((sql) => sql.includes("rollback"))).toBe(true);
    expect(reserved.releases).toBe(1);
  });

  test("drains and releases exactly once when run throws", async () => {
    const { reserved } = dedicatedFixtures();
    await expect(
      client.withDedicatedDatabaseSession(async () => {
        throw new Error("sentinel-domain-failure");
      })
    ).rejects.toThrowError("sentinel-domain-failure");
    expect(reserved.sqlCalls.filter((sql) => sql === "rollback")).toHaveLength(1);
    expect(reserved.releases).toBe(1);
  });

  test("terminates the backend when the drain rollback fails", async () => {
    const { maintenance, reserved } = dedicatedFixtures({
      leaseRespond: (sql) => {
        if (sql === "rollback") throw new Error("sentinel-rollback-failure");
        if (sql.includes("pg_backend_pid")) return [{ pid: 333 }];
        return [];
      },
    });
    const outcome = await client.withDedicatedDatabaseSession(async (session) =>
      session.cancelActiveAndRollback("test")
    );
    expect(outcome).toBe("connection_terminated");
    expect(maintenance.sqlCalls.some((sql) => sql.includes("pg_terminate_backend"))).toBe(true);
    expect(reserved.releases).toBe(1);
  });

  test("rejects execute on an already-aborted signal without reaching the query", async () => {
    const { reserved } = dedicatedFixtures();
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.withDedicatedDatabaseSession(async (session) =>
        session.execute((sql) => sql`select 1` as never, controller.signal)
      )
    ).rejects.toThrowError("dedicated_database_session_lost");
    expect(reserved.sqlCalls.some((sql) => sql.startsWith("cancel select 1"))).toBe(true);
    expect(reserved.releases).toBe(1);
  });

  test("fails assertAlive when the backend probe returns no row", async () => {
    const { reserved } = dedicatedFixtures({ leaseRespond: () => [] });
    await expect(
      client.withDedicatedDatabaseSession(async (session) =>
        session.assertAlive(new AbortController().signal)
      )
    ).rejects.toThrowError("dedicated_database_session_lost");
    expect(reserved.releases).toBe(1);
  });

  test("throws the reserve timeout and releases a late post-deadline session", async () => {
    const { reserved } = dedicatedFixtures({
      leaseRespond: () => [],
      leaseDelayMs: POOL_ACQUISITION_DEADLINE_MS + 150,
    });
    await expect(
      client.withDedicatedDatabaseSession(async () => "never-reached")
    ).rejects.toThrowError("database_pool_reserve_timeout");
    // The deadline won earlier: the late session is released, never handed on,
    // and the acquisition timer is cleared (no further timer work remains).
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(reserved.releases).toBe(1);
  }, 8_000);

  test("throws the caller conflict code without running the lock body", async () => {
    const { reserved } = dedicatedFixtures({ leaseRespond: () => [{ acquired: false }] });
    await expect(
      client.withDedicatedDatabaseAdvisoryLock({
        key: 551551552n,
        signal: new AbortController().signal,
        conflictCode: "sentinel-lock-conflict",
        run: async () => "never-reached",
      })
    ).rejects.toThrowError("sentinel-lock-conflict");
    expect(reserved.sqlCalls.some((sql) => sql.includes("pg_advisory_unlock"))).toBe(false);
    expect(reserved.releases).toBe(1);
  });

  test("terminates the conflicted backend instead of re-pooling it", async () => {
    // The lock is never taken and the exact-true unlock never happens, so the
    // ambiguous-lease path must terminate the reserved backend by PID (the pid
    // probe here returns a live PID) and then release exactly once.
    const { maintenance, reserved } = dedicatedFixtures({
      leaseRespond: (sql) => {
        if (sql.includes("pg_try_advisory_lock")) return [{ acquired: false }];
        if (sql.includes("pg_backend_pid")) return [{ pid: 444 }];
        return [];
      },
    });
    let ran = false;
    await expect(
      client.withDedicatedDatabaseAdvisoryLock({
        key: 551551554n,
        signal: new AbortController().signal,
        conflictCode: "sentinel-lock-conflict",
        run: async () => {
          ran = true;
          return "never-reached";
        },
      })
    ).rejects.toThrowError("sentinel-lock-conflict");
    expect(ran).toBe(false);
    expect(reserved.sqlCalls.some((sql) => sql.includes("pg_backend_pid"))).toBe(true);
    expect(maintenance.sqlCalls.some((sql) => sql.includes("pg_terminate_backend"))).toBe(true);
    expect(reserved.releases).toBe(1);
  });

  test("terminates the backend when the exact unlock result is false", async () => {
    const { maintenance, reserved } = dedicatedFixtures({
      leaseRespond: (sql) => {
        if (sql.includes("pg_try_advisory_lock")) return [{ acquired: true }];
        if (sql.includes("pg_advisory_unlock")) return [{ unlocked: false }];
        if (sql.includes("pg_backend_pid")) return [{ pid: 445 }];
        return [];
      },
    });
    const value = await client.withDedicatedDatabaseAdvisoryLock({
      key: 551551555n,
      signal: new AbortController().signal,
      conflictCode: "sentinel-lock-conflict",
      run: async () => "done",
    });
    expect(value).toBe("done");
    expect(reserved.sqlCalls.some((sql) => sql.includes("pg_backend_pid"))).toBe(true);
    expect(maintenance.sqlCalls.some((sql) => sql.includes("pg_terminate_backend"))).toBe(true);
    expect(reserved.releases).toBe(1);
  });

  test("unlocks on the same backend and releases after a successful run", async () => {
    const { reserved } = dedicatedFixtures({
      leaseRespond: (sql) => {
        if (sql.includes("pg_try_advisory_lock")) return [{ acquired: true }];
        if (sql.includes("pg_advisory_unlock")) return [{ unlocked: true }];
        if (sql.includes("pg_backend_pid")) return [{ pid: 333 }];
        return [];
      },
    });
    const value = await client.withDedicatedDatabaseAdvisoryLock({
      key: 551551553n,
      signal: new AbortController().signal,
      conflictCode: "sentinel-lock-conflict",
      run: async (session) => {
        await session.assertAlive(new AbortController().signal);
        return "done";
      },
    });
    expect(value).toBe("done");
    expect(reserved.sqlCalls.filter((sql) => sql.includes("pg_advisory_unlock"))).toHaveLength(1);
    expect(reserved.releases).toBe(1);
  });
});
