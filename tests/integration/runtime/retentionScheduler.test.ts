// TASK-551-06-L03 — retention scheduler coverage (bun lane), two registers.
// Pure legs (always run; green airtight): the self-contained RETENTION_SCHEDULER_* env parser
// (defaults, corners, every violation, stable code+reason, C5), bounded telemetry (failedFamily
// included), the C6/A7 lock-uniqueness pin, the affinity gate through the LANDED client seam
// (`setDatabaseClientRuntimeForTests` + fake pools, the task551DatabaseLifecycle.test.ts idiom),
// the fake-clock engine matrix, the lifecycle factory, and the repaired DEFAULT job binding: an
// un-injected tick drives the REAL runRetentionPlan through the positional adapter over a fake
// lease pool (the exact composition TASK-551-08-L03 wires).
// Real-DB legs (contract :185-204, owner-executed): disabled startup; enabled startup passing the
// REAL affinity proof before the timer exists; the scheduler driving the REAL runRetentionPlan
// end-to-end (all families disabled + dry-run); the real abort/drain inside the 4,500 ms budget.
// Gate (landed `testIfDb` idiom): database legs register through
// `testIfDb = hasDb ? test : test.skip`, `hasDb` requiring a REAL routable
// DATABASE_URL proven once by `select 1`; under the airtight envelope
// (DATABASE_URL=postgresql://127.0.0.1:1/none) every database leg skips by name —
// skips only, zero failures. The gate controls EXECUTION only; assertions are real,
// and it deliberately does NOT call assertMaintenanceSessionAffinity(): a cached
// module-load proof would defeat the fake-pool probe legs below.
// Ordering law: an affinity proof is cached per lifecycle generation and ONLY a generation bump
// clears it — the regional banners below apply this (real-DB legs first on the empty memo; the
// fake region bumps before its rejections, which likewise precede its one counting success leg).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import {
  assertMaintenanceSessionAffinity,
  closeAllDatabaseClientsWithin,
  DATABASE_CLIENT_ERROR_CODES,
  db,
  setDatabaseClientRuntimeForTests,
} from "../../../core/db/client";
import { RETENTION_CANCEL_DRAIN_DEADLINE_MS } from "../../../core/db/databaseLifecycle";
import {
  createRetentionSchedulerLifecycleParticipant,
  parseRetentionSchedulerEnv,
  RETENTION_SCHEDULER_ERROR_CODE,
  RETENTION_SCHEDULER_PARTICIPANT_ID,
  RetentionSchedulerConfigError,
  sanitizeRetentionJobTelemetry,
  startRetentionScheduler,
  type RetentionPlanRunner,
  type RetentionSchedulerDeps,
  type RetentionSchedulerEnvInput,
} from "../../../core/server/jobs/retentionScheduler";
import {
  registerRuntimeLifecycleParticipant,
  resetRuntimeLifecycleForTests,
  RUNTIME_LIFECYCLE_ERROR_CODES,
  type RuntimeLifecycleParticipant,
} from "../../../core/server/runtimeLifecycle";
import {
  RETENTION_JOB_LOCK_KEY,
  RETENTION_JOB_LOCK_NAMESPACE,
  runRetentionPlan,
} from "../../../core/services/maintenance/retentionJobService";
import type { RuntimeEnv } from "../../../core/services/maintenance/retentionPolicy";

// --- Owner-map gate: a REAL routable DATABASE_URL, per the landed testIfDb ----

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

/** Real-catalog check via the pooled client (never the maintenance channel). */
const advisoryHeld = async (): Promise<boolean> => {
  const rows = (await db.execute(
    sql`select 1 from pg_locks where locktype = 'advisory' and granted
        and classid = ${RETENTION_JOB_LOCK_NAMESPACE} and objid = ${RETENTION_JOB_LOCK_KEY} limit 1`
  )) as unknown as unknown[];
  return rows.length > 0;
};

// --- Pure-leg helpers --------------------------------------------------------

type LogEntry = Readonly<{
  level: "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown>;
}>;

const MSG = Object.freeze({
  disabled: "retention_scheduler_disabled",
  started: "retention_scheduler_started",
  tickSkipped: "retention_scheduler_tick_skipped",
  runCompleted: "retention_scheduler_run_completed",
  runAborted: "retention_scheduler_run_aborted",
  runFailed: "retention_scheduler_run_failed",
  schedulingFailed: "retention_scheduler_tick_scheduling_failed",
  drainElapsed: "retention_scheduler_close_drain_elapsed",
  closed: "retention_scheduler_closed",
});

const makeLogSpy = () => {
  const entries: LogEntry[] = [];
  const add = (level: LogEntry["level"], msg: string, details: Record<string, unknown>) =>
    void entries.push({ level, message: msg, details });
  const log = Object.fromEntries(
    (["info", "warn", "error"] as const).map((level) => [level, add.bind(null, level)])
  ) as unknown as RetentionSchedulerDeps["log"];
  return { entries, log: Object.freeze(log) };
};

const logged = (entries: readonly LogEntry[], message: string): LogEntry | undefined =>
  entries.find((entry) => entry.message === message);
const lastLogged = (entries: readonly LogEntry[], message: string): LogEntry | undefined =>
  entries.filter((entry) => entry.message === message).at(-1);

const makeDeferred = <T>(): { readonly promise: Promise<T>; resolve: (value: T) => void } => {
  let resolve!: (value: T) => void;
  return { promise: new Promise<T>((res) => (resolve = res)), resolve };
};

/** Macrotask-free turns: promise chains settle without firing real timers. */
const yieldTurns = async (rounds = 12): Promise<void> => {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

type RecordedTimer = {
  readonly delayMs: number;
  handle?: unknown;
  unrefs: number;
  cleared: boolean;
  fired: boolean;
  fire: () => void;
};

/** The recorder surface tests see: recorded installs + the sync-failure trigger. */
type TimerRecorder = { readonly scheduled: RecordedTimer[]; explodeNext: () => void };

type RealSetTimeout = (handler: () => void, ms: number) => { unref?: () => unknown };

/** Records every setTimeout (still delegating to the real one) so the engine's timer chain stays
 * live and manually firable; entries track delayMs/unref/cleared/fired; `explodeNext` forces one sync-failure install. */
const withTimers = async <T>(run: (recorder: TimerRecorder) => Promise<T>): Promise<T> => {
  const scheduled: RecordedTimer[] = [];
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const schedule = realSetTimeout as unknown as RealSetTimeout;
  let explosions = 0;
  const recorder = (handler: () => void, timeoutMs?: number): unknown => {
    if (explosions > 0) {
      explosions -= 1;
      throw new Error("synthetic_setTimeout_failure");
    }
    const raw = schedule(handler, timeoutMs ?? 0);
    const entry: RecordedTimer & { handle?: unknown } = {
      delayMs: timeoutMs ?? 0,
      unrefs: 0,
      cleared: false,
      fired: false,
      fire: () => {
        if (entry.fired) return; // idempotent: a naturally fired timer stays fired
        entry.fired = true;
        realClearTimeout(raw as never);
        handler();
      },
    };
    entry.handle = {
      unref: (): void => {
        entry.unrefs += 1;
        raw.unref?.();
      },
    };
    scheduled.push(entry);
    return entry.handle;
  };
  globalThis.setTimeout = recorder as unknown as typeof globalThis.setTimeout;
  globalThis.clearTimeout = ((handle: unknown): unknown => {
    const entry = scheduled.find((candidate) => candidate.handle === handle);
    if (entry) entry.cleared = true;
    return realClearTimeout(handle as never);
  }) as unknown as typeof globalThis.clearTimeout;
  try {
    return await run({ scheduled, explodeNext: () => (explosions = 1) });
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
};

/** Fire the recorded install at `index`, then let its promise chain settle. */
const fireTurn = async (recorder: TimerRecorder, index: number): Promise<void> => {
  recorder.scheduled[index]!.fire();
  await yieldTurns();
};

// --- Fake maintenance pools: the landed client-seam idiom, zero DB contact ---

type FakeQuery = (text: string) => Record<string, unknown>[];
type ClientOverride = NonNullable<Parameters<typeof setDatabaseClientRuntimeForTests>[0]>;

const fakeReserved = (respond: FakeQuery): object => {
  const tag = (strings: TemplateStringsArray): unknown => {
    const text = strings.join("?").replace(/\s+/gu, " ").trim();
    return Object.assign(Promise.resolve(respond(text)), { cancel: () => undefined });
  };
  return Object.assign(tag as object, {
    begin: async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> => run(tag),
    release: (): void => undefined,
    end: async (): Promise<void> => undefined,
  });
};

/** Two-session maintenance pool; `reserveError` models a pool outage on first reserve. */
const fakePool = (
  owner: FakeQuery,
  verifier: FakeQuery = () => [],
  reserveError: string | null = null
): { raw: object; reservations: () => number } => {
  const reserved = [fakeReserved(owner), fakeReserved(verifier)];
  let reservations = 0;
  return {
    raw: Object.assign((() => Promise.resolve([])) as object, {
      reserve: async (): Promise<unknown> => {
        reservations += 1; // counts outage attempts too
        if (reserveError !== null) throw new Error(reserveError);
        return reserved[reservations - 1]!;
      },
      end: async (): Promise<void> => undefined,
    }),
    reservations: () => reservations,
  };
};

const OWNER_LOCK: FakeQuery = (text) =>
  text.includes("pg_try_advisory_lock") ? [{ pid: 111, acquired: true }] : [{ pid: 111 }];
const VERIFIER_FREE: FakeQuery = (text) =>
  text.includes("pg_try_advisory_lock") ? [{ pid: 222, acquired: false }] : [];
/** Owner + free verifier: the successful two-transaction affinity proof. */
const proofPool = (): { raw: object; reservations: () => number } =>
  fakePool(OWNER_LOCK, VERIFIER_FREE);

/** Declared-channel configs exercised by the affinity-gate legs. */
const CHANNEL = {
  cappedPrimary: { pgbouncerMode: "off", maintenanceMode: "primary", poolMax: 1 },
  txPrimary: { pgbouncerMode: "transaction", maintenanceMode: "primary", poolMax: 10 },
  direct: { pgbouncerMode: "off", maintenanceMode: "direct", maintenancePoolMax: 2 },
} as const;

const withFakeClient = async <T>(override: ClientOverride, run: () => Promise<T>): Promise<T> => {
  setDatabaseClientRuntimeForTests(override);
  try {
    return await run();
  } finally {
    setDatabaseClientRuntimeForTests(null);
  }
};

/** Direct channel over a fresh fake proof pool: enabled starts pass the gate socket-free. */
const withDirectChannel = async <T>(run: () => Promise<T>): Promise<T> =>
  withFakeClient({ config: CHANNEL.direct, maintenanceSqlClient: proofPool().raw as never }, run);

/** Engine-matrix harness: direct-channel gate + recorded fake clock. */
const onFakeClock = (run: (recorder: TimerRecorder) => Promise<void>) =>
  withDirectChannel(() => withTimers(run));

// --- Injected environments and runners --------------------------------------

const K = {
  enabled: "RETENTION_SCHEDULER_ENABLED",
  interval: "RETENTION_SCHEDULER_INTERVAL_MS",
  jitter: "RETENTION_SCHEDULER_INITIAL_JITTER_MS",
  maxRun: "RETENTION_SCHEDULER_MAX_RUN_MS",
} as const;

/** Enabled engine defaults: 60s cadence, zero jitter, 1s run budget. */
const schedulerEnv = (
  overrides: Readonly<Record<string, string>> = {}
): RetentionSchedulerEnvInput => {
  const base = { [K.enabled]: "true", [K.interval]: "60000", [K.jitter]: "0", [K.maxRun]: "1000" };
  return Object.freeze({ ...base, ...overrides });
};

const DISABLED_ENV: RetentionSchedulerEnvInput = Object.freeze({ [K.enabled]: "false" });

/** Every registered family token (19), for the explicit all-disabled run env. */
const RETENTION_FAMILY_TOKENS = `${
  "ACCESS_LOGS AUDIT_LOGS EMAIL_DELIVERY_LOGS SEARCH_HISTORY " +
  "INTEGRATION_REQUESTS PASSWORD_RESETS PREVIEW_TOKENS ASSISTANT_INGEST_RUNS ASSISTANT_ACTIONS " +
  "ANALYTICS FORM_SUBMISSIONS WEBHOOK_DELIVERIES SESSIONS SOLUTION_KIT_RUNS PAGE_REVISIONS " +
  "WIDGET_TEMPLATE_REVISIONS DETAIL_PAGE_REVISIONS ENTRY_REVISIONS POST_REVISIONS"
}`.split(" ");

/** Run env for the real-database legs: 19 families disabled AND global dry-run. */
const ALL_FAMILIES_DISABLED_DRY_ENV: RuntimeEnv = Object.freeze({
  ...Object.fromEntries(
    RETENTION_FAMILY_TOKENS.map((family) => [`RETENTION_${family}_ENABLED`, "false"])
  ),
  RETENTION_DRY_RUN: "true",
  RETENTION_BATCH_SIZE: "1",
});

/** Positional adapter matching the service's canonical `(now, signal, deps)` shape. */
const positionalJobAdapter =
  (env: RuntimeEnv): RetentionPlanRunner =>
  async ({ now, signal }) =>
    runRetentionPlan(now, signal, { env });

/** Counting runner for legs that must prove zero/known job activity. */
const makeRuns = (): { counter: { runs: number }; runner: RetentionPlanRunner } => {
  const counter = { runs: 0 };
  const runner: RetentionPlanRunner = async () => {
    counter.runs += 1;
    return null;
  };
  return { counter, runner };
};

// --- Register 1: env parser, C5 (pure, always run) ---------------------------

const SCHEDULER_CODE = readFileSync(
  fileURLToPath(new URL("../../../core/server/jobs/retentionScheduler.ts", import.meta.url)),
  "utf8"
)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("retention scheduler env parser (pure, always runs)", () => {
  test("defaults, frozen config, valid corners, self-contained key set (C5)", () => {
    const config = parseRetentionSchedulerEnv({});
    expect(config).toEqual({
      enabled: false,
      intervalMs: 86_400_000,
      initialJitterMs: 30_000,
      maxRunMs: 300_000,
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(parseRetentionSchedulerEnv({ [K.enabled]: "true" }).enabled).toBe(true);
    expect(parseRetentionSchedulerEnv({ [K.enabled]: "false" }).enabled).toBe(false);
    // Min corners: jitter == interval allowed, maxRun strictly below interval.
    expect(
      parseRetentionSchedulerEnv({ [K.interval]: "60000", [K.jitter]: "60000", [K.maxRun]: "1000" })
    ).toEqual({ enabled: false, intervalMs: 60_000, initialJitterMs: 60_000, maxRunMs: 1_000 });
    // C5: self-contained — unknown keys fail; the L01 unsupported-key sweep is absent here.
    expect(() => parseRetentionSchedulerEnv({ RETENTION_SCHEDULER_LEGACY_KNOB: "1" })).toThrow(
      "unsupported_env_key"
    );
    expect(SCHEDULER_CODE).not.toContain("assertNoUnsupportedRetentionEnvKeys");
    expect(SCHEDULER_CODE).toContain("RETENTION_SCHEDULER_ENABLED");
  });

  test("every malformed, out-of-range, and cross-field violation fails with the stable code", () => {
    const cases: readonly (readonly [RetentionSchedulerEnvInput, string])[] = [
      [{ [K.enabled]: "TRUE" }, "enabled_invalid"],
      [{ [K.enabled]: "1" }, "enabled_invalid"],
      [{ [K.enabled]: "yes" }, "enabled_invalid"],
      [{ [K.interval]: "60_000" }, "interval_ms_invalid"],
      [{ [K.interval]: "1e3" }, "interval_ms_invalid"],
      [{ [K.interval]: " 60000" }, "interval_ms_invalid"],
      [{ [K.interval]: "-1" }, "interval_ms_invalid"],
      [{ [K.interval]: "3.5" }, "interval_ms_invalid"],
      [{ [K.interval]: "" }, "interval_ms_invalid"],
      [{ [K.interval]: "59999" }, "interval_ms_invalid"],
      [{ [K.interval]: "604800001" }, "interval_ms_invalid"],
      [{ [K.jitter]: "soon" }, "initial_jitter_ms_invalid"],
      [{ [K.jitter]: "-5" }, "initial_jitter_ms_invalid"],
      [{ [K.jitter]: "300001" }, "initial_jitter_ms_invalid"],
      [{ [K.interval]: "60000", [K.jitter]: "60001" }, "initial_jitter_ms_exceeds_interval"],
      [{ [K.maxRun]: "later" }, "max_run_ms_invalid"],
      [{ [K.maxRun]: "999" }, "max_run_ms_invalid"],
      [{ [K.maxRun]: "3600001" }, "max_run_ms_invalid"],
      [{ [K.interval]: "60000", [K.maxRun]: "60000" }, "max_run_ms_exceeds_interval"],
      [{ [K.interval]: "60000", [K.maxRun]: "60001" }, "max_run_ms_exceeds_interval"],
    ];
    for (const [env, reason] of cases) {
      let thrown: unknown = null;
      try {
        parseRetentionSchedulerEnv(env);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(RetentionSchedulerConfigError);
      const configError = thrown as RetentionSchedulerConfigError;
      expect(configError.code).toBe(RETENTION_SCHEDULER_ERROR_CODE);
      expect(configError.reason).toBe(reason);
      // Exact message form: code + reason only, never a raw key or value (redaction).
      expect(configError.message).toBe(`${RETENTION_SCHEDULER_ERROR_CODE} (${reason})`);
    }
  });

  test("configuration failures precede any timer or affinity work", async () => {
    const pool = proofPool();
    await withTimers(async (recorder) =>
      withFakeClient(
        { config: CHANNEL.direct, maintenanceSqlClient: pool.raw as never },
        async () => {
          expect(() =>
            createRetentionSchedulerLifecycleParticipant({ env: { [K.interval]: "nan" } })
          ).toThrow(RetentionSchedulerConfigError);
          await expect(startRetentionScheduler({ env: { [K.maxRun]: "x" } })).rejects.toThrowError(
            RETENTION_SCHEDULER_ERROR_CODE
          );
          expect(recorder.scheduled).toHaveLength(0); // no timer was ever created
          expect(pool.reservations()).toBe(0); // no affinity probe, no reservation
        }
      )
    );
  });
});

describe("retention scheduler telemetry and lock uniqueness (pure, always runs)", () => {
  test("projections are allowlisted, bounded, and redacted", () => {
    const projected = sanitizeRetentionJobTelemetry({
      status: "completed",
      code: null,
      startedAt: new Date(0), // non-allowlisted aggregate: dropped
      families: [
        { family: "analytics", status: "completed", deleted: 2, matched: 2, batches: 1 },
        { family: "x".repeat(80), status: "UPPER", deleted: -1 },
      ],
    });
    expect([projected.status, projected.code]).toEqual(["completed", undefined]);
    const [clean, dirty] = projected.families;
    expect([clean!.family, clean!.status]).toEqual(["analytics", "completed"]);
    expect([clean!.deleted, clean!.matched, clean!.batches]).toEqual([2, 2, 1]);
    expect([dirty!.family, dirty!.status]).toEqual(["redacted", "redacted"]);
    expect(dirty!.deleted).toBeUndefined(); // -1 is not a safe count
    // failedFamily passes the same sanitizeToken gate (the failing family id, contract :242-254).
    const failed = sanitizeRetentionJobTelemetry({
      status: "retention_family_failed",
      code: "retention_family_failed",
      failedFamily: "audit_logs",
    });
    expect(failed.failedFamily).toBe("audit_logs"); // the failing family id travels verbatim
    const dirtyFailed = sanitizeRetentionJobTelemetry({ failedFamily: "AUDIT LOGS" });
    expect(dirtyFailed.failedFamily).toBe("redacted"); // a non-token id collapses like dirty text
    const bounded = sanitizeRetentionJobTelemetry({
      status: "completed",
      families: Array.from({ length: 40 }, (_, index) => ({ family: `f${index}` })),
    });
    expect(bounded.families).toHaveLength(32); // MAX_TELEMETRY_FAMILIES
  });

  test("the retention lock pair is absent from every landed session advisory lock (C6/A7)", () => {
    // Landed inventory: startup migrations, startup assistant docs, the backup
    // scheduler, submission-export scheduler, and the probe's bigint key (classid 0).
    const inventory: readonly (readonly [number, number])[] = [
      [20260604, 400],
      [20260604, 403],
      [20260628, 484],
      [20260818, 571],
      [0, 551551551],
    ];
    const packed = (BigInt(RETENTION_JOB_LOCK_NAMESPACE) << 32n) | BigInt(RETENTION_JOB_LOCK_KEY);
    expect(packed).not.toBe(551551551n);
    for (const [classid, objid] of inventory) {
      expect([RETENTION_JOB_LOCK_NAMESPACE, RETENTION_JOB_LOCK_KEY]).not.toEqual([classid, objid]);
      expect(packed).not.toBe((BigInt(classid) << 32n) | BigInt(objid));
    }
  });
});

// --- Register 2: real-database legs (owner-executed; airtight skips them) ----
// FIRST probing region: the memo is empty, so the enabled start performs the one real affinity probe (contract :130-132); these legs exercise channel, service, drain.

describe("retention scheduler on the real fixture database (owner-executed)", () => {
  testIfDb(
    "disabled starts ordinarily; enabled passes the REAL affinity proof before the timer exists",
    async () => {
      const { counter, runner } = makeRuns();
      const disabled = await startRetentionScheduler({
        env: DISABLED_ENV,
        runRetentionPlan: runner,
      });
      expect(disabled.config.enabled).toBe(false);
      await disabled.tick();
      expect(counter.runs).toBe(0); // disabled schedulers perform zero job activity
      await disabled.stop();
      // The real probe settles first, so the scheduler's own gate reuses it: db start + scheduler start = one probe (the direct-channel leg pins the exact count).
      await assertMaintenanceSessionAffinity();
      await withTimers(async (recorder) => {
        const controller = await startRetentionScheduler({
          env: schedulerEnv({ [K.jitter]: "30000" }),
          runRetentionPlan: runner,
        });
        expect(controller.config.enabled).toBe(true);
        expect(recorder.scheduled.length).toBeGreaterThanOrEqual(1); // the jitter timer exists
        expect(recorder.scheduled.some((entry) => entry.unrefs >= 1)).toBe(true); // unref'd
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(counter.runs).toBe(0); // jitter (<= 30s) never fires inside the leg
        await controller.stop();
        expect(recorder.scheduled.every((entry) => entry.cleared || entry.fired)).toBe(true);
        expect(counter.runs).toBe(0);
      });
    },
    30_000
  );

  testIfDb(
    "the scheduler drives the real job service end-to-end and releases the advisory lock",
    async () => {
      // tick() resolves void, so the runner captures the published summary.
      const adapter = positionalJobAdapter(ALL_FAMILIES_DISABLED_DRY_ENV);
      let summary: null | {
        status: string;
        dryRun: boolean;
        families: readonly { batches: number; deleted: number }[];
      } = null;
      const controller = await startRetentionScheduler({
        env: schedulerEnv({ [K.jitter]: "30000" }),
        runRetentionPlan: async (input) => {
          const published = await adapter(input);
          summary = published as typeof summary;
          return published;
        },
      });
      await controller.tick();
      expect(summary).not.toBeNull();
      expect(summary!.status).toBe("completed");
      expect(summary!.dryRun).toBe(true);
      expect(summary!.families).toHaveLength(19); // every registered family, zero SQL
      expect(summary!.families.every((row) => row.batches === 0 && row.deleted === 0)).toBe(true);
      expect(await advisoryHeld()).toBe(false); // published before unlock; lock free again
      await controller.stop();
    }
  );

  testIfDb(
    "close aborts a live run, the real service publishes aborted, and the drain settles inside 4,500 ms",
    async () => {
      const events: string[] = [];
      const started = makeDeferred<void>(); // resolved by the runner at "run-started"
      let hookCalls = 0;
      const controller = await startRetentionScheduler({
        env: schedulerEnv({ [K.jitter]: "30000" }),
        cancelActiveRetentionSession: async (reason) => {
          hookCalls += 1;
          events.push(`cancel:${reason}`);
          return "rolled_back";
        },
        runRetentionPlan: async ({ now, signal }) => {
          events.push("run-started");
          started.resolve();
          await new Promise<void>((resolve) => {
            if (signal.aborted) resolve();
            else signal.addEventListener("abort", () => resolve(), { once: true });
          });
          events.push("abort-observed");
          // The REAL job service on a pre-aborted signal: the lease path runs for real; C8 precedence publishes `aborted` (never a failure code), even with session loss.
          const published = await runRetentionPlan(now, signal, {
            env: ALL_FAMILIES_DISABLED_DRY_ENV,
          });
          events.push(`summary:${published.status}`);
          return published;
        },
      });
      void controller.tick();
      await started.promise; // the runner signals "run-started" before awaiting the abort
      const startedAt = Date.now();
      await controller.stop("signal");
      expect(Date.now() - startedAt).toBeLessThan(RETENTION_CANCEL_DRAIN_DEADLINE_MS);
      expect(events[0]).toBe("run-started");
      expect(events).toContain("abort-observed");
      expect(events).toContain("summary:aborted");
      expect(events).toContain("cancel:signal");
      expect(hookCalls).toBe(1);
      expect(await advisoryHeld()).toBe(false);
      // A closed controller schedules nothing further: a manual tick is inert.
      await controller.tick();
      expect(events).not.toContain("summary:completed");
    },
    60_000
  );
});

// --- Register 1 (resumed): affinity gating via the landed client seam -------- (beforeEach bump, landed idiom: ends never-dialed clients, bumps generation; each leg re-probes)

describe("retention scheduler affinity gating (pure, DB-free via the client seam)", () => {
  const UNAVAILABLE = DATABASE_CLIENT_ERROR_CODES.maintenanceSessionUnavailable;

  beforeEach(async () => {
    await closeAllDatabaseClientsWithin(10_000);
  });

  const rejectsWith = (deps: RetentionSchedulerDeps, message: string) =>
    expect(startRetentionScheduler(deps)).rejects.toThrowError(message);

  test("disabled needs no probe; enabled probe rejections leave zero timer and zero job activity", async () => {
    const { counter, runner } = makeRuns();
    // Shared rejection harness; callers assert per-leg probe/timer/job-activity outcomes.
    const rejectVia = (config: ClientOverride["config"], pool: { raw: object }, message: string) =>
      withFakeClient({ config, maintenanceSqlClient: pool.raw as never }, () =>
        rejectsWith({ env: schedulerEnv(), runRetentionPlan: runner }, message)
      );
    // Disabled at off+primary+DB_POOL_MAX=1: ordinary startup, zero probe/reservation.
    await withFakeClient(
      { config: CHANNEL.cappedPrimary, maintenanceSqlClient: proofPool().raw as never },
      async () => {
        const controller = await startRetentionScheduler({
          env: DISABLED_ENV,
          runRetentionPlan: runner,
        });
        expect(controller.config.enabled).toBe(false);
        await controller.tick();
        expect(counter.runs).toBe(0);
        await controller.stop();
      }
    );
    await withTimers(async (recorder) => {
      // Enabled on the same single-capacity primary: the guard rejects before any probe.
      const capped = proofPool();
      await rejectVia(CHANNEL.cappedPrimary, capped, UNAVAILABLE);
      expect(capped.reservations()).toBe(0);
      expect(recorder.scheduled).toHaveLength(0);
      expect(counter.runs).toBe(0);
      // Transaction+primary: same stable code, zero probe.
      await rejectVia(CHANNEL.txPrimary, proofPool(), UNAVAILABLE);
      expect(counter.runs).toBe(0);
      // Pool down, declared direct: reserve failure propagates verbatim (stable code = verdicts).
      const outage = fakePool(OWNER_LOCK, VERIFIER_FREE, "synthetic_maintenance_outage");
      await rejectVia(CHANNEL.direct, outage, "synthetic_maintenance_outage");
      expect(outage.reservations()).toBe(1);
      expect(counter.runs).toBe(0);
      // Transaction pooling: verifier re-acquires; the probe ran (2), no timer/job survives.
      const reentrant = fakePool(OWNER_LOCK, (text) =>
        text.includes("pg_try_advisory_lock") ? [{ pid: 111, acquired: true }] : []
      );
      await rejectVia(CHANNEL.direct, reentrant, UNAVAILABLE);
      expect(reentrant.reservations()).toBe(2);
      expect(recorder.scheduled).toHaveLength(0);
      expect(counter.runs).toBe(0);
      // PID drift: the owner's second probe transaction lands on another backend.
      const driftOwner: FakeQuery = (text) => {
        if (text.includes("pg_try_advisory_lock")) return [{ pid: 111, acquired: true }];
        if (text.includes("pg_advisory_unlock")) return [{ pid: 111 }];
        return [{ pid: 999 }];
      };
      const drift = fakePool(driftOwner, VERIFIER_FREE);
      await rejectVia(CHANNEL.direct, drift, UNAVAILABLE);
      expect(drift.reservations()).toBe(2);
      expect(recorder.scheduled).toHaveLength(0);
      expect(counter.runs).toBe(0);
    });
  });

  test("a declared direct channel probes exactly once, reaches the timer and the job; session pooling passes", async () => {
    // Ordering law: first SUCCESSFUL probe in this generation — the one-physical-probe proof.
    await withTimers(async (recorder) => {
      const pool = proofPool();
      const { entries, log } = makeLogSpy();
      const { counter, runner } = makeRuns();
      await withFakeClient(
        { config: CHANNEL.direct, maintenanceSqlClient: pool.raw as never },
        async () => {
          const controller = await startRetentionScheduler({
            env: schedulerEnv(),
            runRetentionPlan: runner,
            log,
          });
          expect(pool.reservations()).toBe(2); // one probe = owner + verifier, memoized
          expect(logged(entries, MSG.started)).toBeDefined();
          await fireTurn(recorder, 0);
          expect(counter.runs).toBe(1);
          // An idempotent second start reserves nothing new and logs once only.
          await controller.start();
          expect(pool.reservations()).toBe(2);
          expect(entries.filter((entry) => entry.message === MSG.started)).toHaveLength(1);
          await controller.stop();
          expect(logged(entries, MSG.closed)).toBeDefined();
        }
      );
      // Session pooling: the guard accepts the same way (probe channel-agnostic, proof memoized).
      const { counter: sessionRuns, runner: sessionRunner } = makeRuns();
      await withFakeClient(
        {
          // Session pooling is expressed by the maintenance channel alone;
          // DatabasePgbouncerMode is only "off" | "transaction" (core/db/databaseConfig.ts).
          config: { pgbouncerMode: "off", maintenanceMode: "session", maintenancePoolMax: 2 },
          maintenanceSqlClient: proofPool().raw as never,
        },
        async () => {
          const controller = await startRetentionScheduler({
            env: schedulerEnv({ [K.jitter]: "30000" }),
            runRetentionPlan: sessionRunner,
          });
          await yieldTurns();
          expect(sessionRuns.runs).toBe(0); // jitter (<= 30s) never fires inside the leg
          await controller.stop();
          expect(sessionRuns.runs).toBe(0);
        }
      );
    });
  });
});

// --- Register 1 (resumed): fake-clock engine matrix ---- (every enabled start passes the gate via `onFakeClock`: direct channel + recorded clock)

describe("retention scheduler engine on a fake clock (pure, always runs)", () => {
  test("disabled: no timers, ticks skipped, zero activity; enabled jitter stays bounded", async () => {
    await onFakeClock(async (recorder) => {
      const { entries, log } = makeLogSpy();
      const { counter, runner } = makeRuns();
      const controller = await startRetentionScheduler({
        env: DISABLED_ENV,
        runRetentionPlan: runner,
        log,
      });
      expect(controller.config.enabled).toBe(false);
      expect(logged(entries, MSG.disabled)).toBeDefined();
      await controller.tick();
      expect(counter.runs).toBe(0);
      expect(logged(entries, MSG.tickSkipped)?.details["reason"]).toBe("scheduler_disabled");
      expect(recorder.scheduled).toHaveLength(0); // zero timer activity while disabled
      await controller.stop();
      // Enabled: the first delay is uniform in [0, initialJitterMs].
      const delays: number[] = [];
      for (const random of [() => 0, () => 0.5, () => 0.99999]) {
        const enabled = await startRetentionScheduler({
          env: schedulerEnv({ [K.jitter]: "900" }),
          runRetentionPlan: runner,
          random,
        });
        delays.push(recorder.scheduled.at(-1)!.delayMs);
        await enabled.stop();
      }
      expect(delays).toEqual([0, 450, 900]); // floor(random * (jitter + 1)), never above jitter
    });
  });

  test("cadence is the fixed interval with unref'd timers, one fresh signal per run, strict non-overlap", async () => {
    await onFakeClock(async (recorder) => {
      const { entries, log } = makeLogSpy();
      const signals: AbortSignal[] = [];
      let runs = 0;
      const first = makeDeferred<unknown>(); // run 1 hangs until the test resolves it
      const controller = await startRetentionScheduler({
        env: schedulerEnv(),
        log,
        runRetentionPlan: async (input) => {
          runs += 1;
          signals.push(input.signal);
          if (runs === 1) return first.promise;
          return { status: "completed", families: [] };
        },
      });
      expect([controller.config.enabled, controller.config.intervalMs]).toEqual([true, 60_000]);
      await fireTurn(recorder, 0); // jitter tick (delay 0)
      expect(runs).toBe(1);
      await fireTurn(recorder, 1); // due while run 1 is alive
      expect(runs).toBe(1); // dropped, not queued, not overlapped (contract :98)
      const dropped = logged(entries, MSG.tickSkipped);
      expect(dropped?.level === "warn" && dropped.details["reason"] === "run_active").toBe(true);
      first.resolve({ status: "completed", families: [] });
      await yieldTurns();
      await fireTurn(recorder, 2); // the next interval retries the tick
      expect(runs).toBe(2);
      expect(recorder.scheduled.map((entry) => entry.delayMs)).toEqual([0, 60000, 60000, 60000]);
      expect(recorder.scheduled.every((entry) => entry.unrefs === 1)).toBe(true); // never holds the process
      expect(logged(entries, MSG.runCompleted)?.details["status"]).toBe("completed");
      expect(signals).toHaveLength(2);
      expect(new Set(signals).size).toBe(2); // exactly one participant-owned signal per run
      await controller.stop();
    });
  });

  test("tick failures are caught, redacted, contained; closed codes pass verbatim; sync install failures too", async () => {
    const REDACTED = "retention_scheduler_unclassified_error";
    const LEAK = "postgresql://retention:hunter2@db.invalid/ret?bind=leak x";
    await onFakeClock(async (recorder) => {
      // (a+b) One engine, three ticks: driver text collapses to the redacted token (attempts
      // 1 and 3), the closed-set code passes verbatim (attempt 2); the cadence survives both.
      const { entries, log } = makeLogSpy();
      let attempts = 0;
      const controller = await startRetentionScheduler({
        env: schedulerEnv(),
        log,
        runRetentionPlan: async () => {
          attempts += 1;
          if (attempts === 2) throw new Error("retention_job_locked");
          throw new Error(LEAK);
        },
      });
      await fireTurn(recorder, 0);
      expect(attempts).toBe(1);
      expect(logged(entries, MSG.runFailed)?.level).toBe("error");
      expect(logged(entries, MSG.runFailed)?.details["error"]).toBe(REDACTED);
      await fireTurn(recorder, 1);
      expect(attempts).toBe(2);
      expect(lastLogged(entries, MSG.runFailed)?.details["error"]).toBe("retention_job_locked");
      await fireTurn(recorder, 2);
      expect(attempts).toBe(3); // the cadence survived both failures
      expect(lastLogged(entries, MSG.runFailed)?.details["error"]).toBe(REDACTED);
      expect(JSON.stringify(entries)).not.toContain("postgresql://");
      expect(JSON.stringify(entries)).not.toContain("hunter2");
      await controller.stop();
      // (c) A sync timer-install failure: caught, redacted; engine alive; manual tick reaches the job.
      const other = makeLogSpy();
      let runs = 0;
      const survived = await startRetentionScheduler({
        env: schedulerEnv(),
        log: other.log,
        runRetentionPlan: async () => {
          runs += 1;
          return { status: "completed", families: [] };
        },
      });
      recorder.explodeNext();
      await fireTurn(recorder, recorder.scheduled.length - 1);
      expect(runs).toBe(0); // the tick never started
      expect(logged(other.entries, MSG.schedulingFailed)?.level).toBe("error");
      expect(logged(other.entries, MSG.schedulingFailed)?.details["error"]).toBe(REDACTED);
      expect(JSON.stringify(other.entries)).not.toContain("synthetic_setTimeout_failure");
      await survived.tick();
      expect(runs).toBe(1);
      await survived.stop();
    });
  });

  test("close: stop ticks, abort first, then cancel/drain inside the budget; elapsed drains re-awaited", async () => {
    await onFakeClock(async (recorder) => {
      const closeSignal = new AbortController();
      closeSignal.abort(); // the lifecycle aborts the close-context signal first
      // (a) Abort on close: a driver-style run rejects on abort; order is stop ticks
      // -> abort -> cancel. The C8b pin: the rejection must log info, never error.
      const a = makeLogSpy();
      const events: string[] = [];
      let hookCalls = 0;
      const participant = createRetentionSchedulerLifecycleParticipant({
        env: schedulerEnv(),
        log: a.log,
        cancelActiveRetentionSession: async (reason) => {
          hookCalls += 1;
          events.push(`cancel:${reason}`);
          return "rolled_back";
        },
        runRetentionPlan: (input) =>
          new Promise((_resolve, reject) => {
            events.push("run-started");
            const onAbort = (): void => {
              events.push("run-aborted");
              reject(new Error("retention_driver_abort"));
            };
            input.signal.addEventListener("abort", onAbort, { once: true });
          }),
      });
      await participant.start();
      await fireTurn(recorder, 0);
      const startedAt = Date.now();
      await participant.close("signal", {
        absoluteDeadline: Date.now() + RETENTION_CANCEL_DRAIN_DEADLINE_MS,
        signal: closeSignal.signal,
      });
      expect(Date.now() - startedAt).toBeLessThan(RETENTION_CANCEL_DRAIN_DEADLINE_MS);
      expect(events).toEqual(["run-started", "run-aborted", "cancel:signal"]);
      expect(logged(a.entries, MSG.closed)?.details["drainOutcome"]).toBe("rolled_back");
      expect(logged(a.entries, MSG.runAborted)?.level).toBe("info"); // C8b: lifecycle, not failure
      expect(a.entries.some((entry) => entry.level === "error")).toBe(false);
      expect(recorder.scheduled.every((entry) => entry.cleared || entry.fired)).toBe(true);
      await participant.close("test", {
        absoluteDeadline: Date.now(),
        signal: closeSignal.signal,
      });
      expect(hookCalls).toBe(1); // idempotent close re-invokes nothing
      // (b) Stubborn: a run outliving the budget is re-awaited, never abandoned; the cancel
      // hook fast-forwards the injected clock: zero drain budget left, no real-millisecond waits.
      const b = makeLogSpy();
      const stubborn = makeDeferred<unknown>();
      let clockMs = 1_000_000;
      const controller = await startRetentionScheduler({
        env: schedulerEnv(),
        log: b.log,
        now: () => clockMs,
        cancelActiveRetentionSession: async () => {
          clockMs += 100_000_000;
          return "rolled_back";
        },
        runRetentionPlan: () => stubborn.promise, // ignores abort entirely
      });
      await fireTurn(recorder, recorder.scheduled.length - 1);
      let stopSettled = false;
      const stopped = controller.stop("signal").then(() => (stopSettled = true));
      await yieldTurns();
      // The zero-remaining drain ceiling is a REAL 1 ms timer (awaitBounded); give it wall-clock time — setImmediate rounds alone can stay inside the same millisecond.
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(stopSettled).toBe(false); // the elapsed run is still being awaited
      expect(logged(b.entries, MSG.drainElapsed)).toBeDefined();
      stubborn.resolve({ status: "aborted", families: [] });
      await stopped;
      expect(stopSettled).toBe(true); // stop resolved only after the run settled
    });
  });
});

// --- Register 1 (resumed): the repaired DEFAULT job binding (no runner injected) ---

describe("retention scheduler default job binding (pure, DB-free via the client seam)", () => {
  test("an un-injected tick runs the REAL runRetentionPlan; stop settles cleanly", async () => {
    // Probe owner + verifier first (a fresh probe), then owner-backed leases forever.
    const pool = (): object => {
      const probe = [fakeReserved(OWNER_LOCK), fakeReserved(VERIFIER_FREE)];
      let handed = 0;
      return Object.assign((() => Promise.resolve([])) as object, {
        reserve: async (): Promise<unknown> => probe[handed++] ?? fakeReserved(OWNER_LOCK),
        end: async (): Promise<void> => undefined,
      });
    };
    // The default binding passes NO env: the service reads process.env as production will — install the same disabled+dry-run policies the real-DB legs inject, restoring every touched key after.
    const saved = Object.keys(ALL_FAMILIES_DISABLED_DRY_ENV).map(
      (key) => [key, process.env[key]] as const
    );
    Object.assign(process.env, ALL_FAMILIES_DISABLED_DRY_ENV);
    try {
      const { entries, log } = makeLogSpy();
      await withFakeClient(
        { config: CHANNEL.direct, maintenanceSqlClient: pool() as never },
        async () => {
          const controller = await startRetentionScheduler({
            env: schedulerEnv({ [K.jitter]: "30000" }),
            log,
          });
          await controller.tick(); // the one run: the default binding, un-injected
          await controller.stop();
          const completed = logged(entries, MSG.runCompleted);
          expect(completed?.details["status"]).toBe("completed"); // adapter -> REAL service
          const families = (completed?.details["families"] ?? []) as readonly {
            batches: number;
            deleted: number;
          }[];
          expect(families).toHaveLength(RETENTION_FAMILY_TOKENS.length); // the REAL registry ran
          expect(families.every((row) => row.batches === 0 && row.deleted === 0)).toBe(true);
          expect(entries.some((entry) => entry.message === MSG.runFailed)).toBe(false);
          expect(logged(entries, MSG.closed)?.details["drainOutcome"]).toBe("no_active_session");
        }
      );
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

// --- Register 1 (resumed): lifecycle factory ---------------------------------

describe("retention scheduler lifecycle participant (pure, always runs)", () => {
  test("fixed id/phase, frozen, registers nothing; start is idempotent; one signal per run", async () => {
    await onFakeClock(async (recorder) => {
      resetRuntimeLifecycleForTests();
      try {
        const { entries, log } = makeLogSpy();
        const signals: AbortSignal[] = [];
        const participant: RuntimeLifecycleParticipant =
          createRetentionSchedulerLifecycleParticipant({
            env: schedulerEnv({ [K.jitter]: "0" }),
            log,
            runRetentionPlan: async (input) => {
              signals.push(input.signal);
              return { status: "completed", families: [] };
            },
          });
        expect(participant.id).toBe(RETENTION_SCHEDULER_PARTICIPANT_ID);
        expect(participant.phase).toBe("worker");
        expect(Object.isFrozen(participant)).toBe(true);
        // If the factory registered anything, this registration would collide.
        expect(() => registerRuntimeLifecycleParticipant(participant)).not.toThrow();
        // Start is awaited and idempotent: three concurrent calls, one startup log.
        await Promise.all([participant.start(), participant.start(), participant.start()]);
        expect(entries.filter((entry) => entry.message === MSG.started)).toHaveLength(1);
        await fireTurn(recorder, 0);
        await fireTurn(recorder, 1);
        expect(signals).toHaveLength(2);
        expect(new Set(signals).size).toBe(2); // exactly one participant-owned signal per run
        // The public registry still rejects a second participant with the same id.
        const duplicate = createRetentionSchedulerLifecycleParticipant({ env: DISABLED_ENV });
        expect(() => registerRuntimeLifecycleParticipant(duplicate)).toThrowError(
          RUNTIME_LIFECYCLE_ERROR_CODES.duplicateId
        );
      } finally {
        resetRuntimeLifecycleForTests();
      }
    });
  });
});

// --- File-wide safety nets: no leaked client override or registry ------------

afterEach(() => {
  setDatabaseClientRuntimeForTests(null); // belt-and-braces: no leaked override
});

afterAll(() => {
  resetRuntimeLifecycleForTests();
});
