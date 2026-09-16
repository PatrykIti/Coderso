/**
 * TASK-551-06-L03: environment-gated maintenance retention scheduler.
 *
 * One internal engine, two entry shapes (contract :91-110):
 *
 * - `createRetentionSchedulerLifecycleParticipant(deps)` returns the fixed
 *   `{ id: "retention-scheduler", phase: "worker" }` runtime-lifecycle
 *   participant. It registers NOTHING itself — TASK-551-08-L03 is the sole
 *   later composition writer that hands it to
 *   `registerRuntimeLifecycleParticipant` from the shared HTTP composition.
 * - `startRetentionScheduler(deps)` returns a `RetentionSchedulerController`
 *   with start/tick/stop seams for hosts and suites outside the lifecycle.
 *
 * Strict ordering, identical in both shapes:
 *
 * 1. Parse/validate first. The self-contained env parser throws a stable
 *    machine code before any timer, affinity, or connection work. It reads
 *    exactly the four `RETENTION_SCHEDULER_*` keys and never calls L01's
 *    `assertNoUnsupportedRetentionEnvKeys`, which would reject those very
 *    keys (correction C5). Stricter-than-minimum, documented for operators:
 *    an unknown `RETENTION_SCHEDULER_`-prefixed key fails startup too,
 *    because a silently ignored knob is indistinguishable from a knob that
 *    took effect.
 * 2. Disabled (`RETENTION_SCHEDULER_ENABLED` absent or `false`) returns
 *    before any affinity probe, reservation, or timer, so
 *    `off + primary + DB_POOL_MAX=1` stays a valid ordinary startup
 *    (contract :128-132, :287-290).
 * 3. Enabled awaits L02's `assertMaintenanceSessionAffinity()` BEFORE the
 *    timer exists. The probe is lifecycle-memoized in the client, so database
 *    start plus scheduler start perform one physical probe total
 *    (contract :130-132, :194-195). A transaction-pooled or capacity-starved
 *    channel therefore fails startup as
 *    `database_maintenance_session_unavailable` before any timer or listener
 *    activity, with zero job activity.
 *
 * Tick machinery: one local `setTimeout` chain, `.unref()`d so it never holds
 * the process open; the first delay is uniform in
 * `[0, RETENTION_SCHEDULER_INITIAL_JITTER_MS]`, later delays are the fixed
 * `RETENTION_SCHEDULER_INTERVAL_MS` measured from tick start. Ticks never
 * overlap: a due tick while a run is alive is dropped with a sanitized log
 * and retried on the next interval. Every tick hands the job service exactly
 * one participant-owned `AbortSignal`. Synchronous and asynchronous tick
 * failures are caught, redacted to stable codes, and contained — they never
 * crash the process and never disable auth, backups, or request handling.
 *
 * Close (participant and controller share one implementation; contract
 * :106-108, :143-146): stop ticks -> abort the run controller -> invoke the
 * injected dedicated-session cancel/drain hook and confirm rollback or
 * backend termination -> await the run, all bounded by
 * `RETENTION_CANCEL_DRAIN_DEADLINE_MS`. Close is idempotent and awaited. A
 * drain that outlives its budget is never abandoned: it is tracked and
 * re-awaited by `stop`/a later close (the runtime lifecycle's elapsed-close
 * law) and never masks the shutdown outcome.
 *
 * Telemetry law (contract :242-254): logs carry status/code/family
 * identifiers, aggregate counts, and durations only — never row samples,
 * PII, content, SQL binds, URLs, credentials, tokens, hashes, or raw driver
 * text. Unknown error text collapses to a single redacted token.
 */

import { assertMaintenanceSessionAffinity, DATABASE_CLIENT_ERROR_CODES } from "../../db/client";
import { RETENTION_CANCEL_DRAIN_DEADLINE_MS } from "../../db/databaseLifecycle";
import { runRetentionPlan } from "../../services/maintenance/retentionJobService";
import type {
  RuntimeCloseContext,
  RuntimeLifecycleParticipant,
  ShutdownReason,
} from "../runtimeLifecycle";

// ---------------------------------------------------------------------------
// Identity, configuration bounds, and stable failure codes
// ---------------------------------------------------------------------------

/** Fixed participant identity; TASK-551-08-L03's registry rejects duplicates. */
export const RETENTION_SCHEDULER_PARTICIPANT_ID = "retention-scheduler";

const LOG_PREFIX = "[retentionScheduler] ";

/** Exactly the four environment keys this scheduler owns (contract :149-154). */
const SCHEDULER_ENV_KEYS = {
  enabled: "RETENTION_SCHEDULER_ENABLED",
  intervalMs: "RETENTION_SCHEDULER_INTERVAL_MS",
  initialJitterMs: "RETENTION_SCHEDULER_INITIAL_JITTER_MS",
  maxRunMs: "RETENTION_SCHEDULER_MAX_RUN_MS",
} as const;

const SUPPORTED_SCHEDULER_ENV_KEYS: ReadonlySet<string> = new Set(
  Object.values(SCHEDULER_ENV_KEYS)
);

const DEFAULT_INTERVAL_MS = 86_400_000;
const DEFAULT_INITIAL_JITTER_MS = 30_000;
const DEFAULT_MAX_RUN_MS = 300_000;
const MIN_INTERVAL_MS = 60_000;
const MAX_INTERVAL_MS = 604_800_000;
const MIN_INITIAL_JITTER_MS = 0;
const MAX_INITIAL_JITTER_MS = 300_000;
const MIN_MAX_RUN_MS = 1_000;
const MAX_MAX_RUN_MS = 3_600_000;

/** Upper bound on family rows emitted in one sanitized telemetry record. */
const MAX_TELEMETRY_FAMILIES = 32;

/**
 * The one stable scheduler configuration failure code. `reason` is a second
 * stable token narrowing the rule that failed; neither ever embeds a raw
 * environment key or value (same discipline as L01's policy errors).
 */
export const RETENTION_SCHEDULER_ERROR_CODE = "retention_scheduler_config_invalid";

export class RetentionSchedulerConfigError extends Error {
  readonly code: string;
  readonly reason: string;

  constructor(reason: string) {
    super(`${RETENTION_SCHEDULER_ERROR_CODE} (${reason})`);
    this.name = "RetentionSchedulerConfigError";
    this.code = RETENTION_SCHEDULER_ERROR_CODE;
    this.reason = reason;
  }
}

function fail(reason: string): never {
  throw new RetentionSchedulerConfigError(reason);
}

/**
 * Closed failure-code set from contract :156-158, allowlisted here so the
 * redactor can pass job-service codes through verbatim. The canonical owner
 * is the sibling job-service leaf; this copy is redaction vocabulary only.
 */
const RETENTION_JOB_ERROR_CODES: readonly string[] = [
  "retention_job_locked",
  "retention_lock_lost",
  "retention_job_timeout",
  "retention_family_failed",
  "partition_readiness_unavailable",
];

/** Error messages that are proven stable codes and may reach a log verbatim. */
const LOGGABLE_ERROR_MESSAGES: ReadonlySet<string> = new Set([
  ...Object.values(DATABASE_CLIENT_ERROR_CODES),
  ...RETENTION_JOB_ERROR_CODES,
  RETENTION_SCHEDULER_ERROR_CODE,
]);

/** The token replacing every non-allowlisted error text. */
const REDACTED_ERROR_TOKEN = "retention_scheduler_unclassified_error";

// ---------------------------------------------------------------------------
// Environment parsing (self-contained; correction C5)
// ---------------------------------------------------------------------------

export type RetentionSchedulerEnvInput = Readonly<Record<string, string | undefined>>;

export type RetentionSchedulerConfig = Readonly<{
  enabled: boolean;
  intervalMs: number;
  initialJitterMs: number;
  maxRunMs: number;
}>;

/** Digits only: rejects signs, decimals, exponents, whitespace, separators. */
const ENV_INTEGER_PATTERN = /^\d+$/;

function parseBoundedMs(
  raw: string | undefined,
  fallback: number,
  minMs: number,
  maxMs: number,
  reason: string
): number {
  if (raw === undefined) return fallback;
  if (!ENV_INTEGER_PATTERN.test(raw)) fail(reason);
  const parsed = Number(raw);
  if (parsed < minMs || parsed > maxMs) fail(reason);
  return parsed;
}

/**
 * Strict parser over an injected environment record (never `process.env`
 * directly in tests). Absent `RETENTION_SCHEDULER_ENABLED` is false; a
 * present value must be exactly lowercase `true` or `false`. Every numeric
 * key is digits-only and bound-checked, and the two cross-key relations from
 * the contract hold: jitter <= interval and maxRun < interval.
 */
export function parseRetentionSchedulerEnv(
  env: RetentionSchedulerEnvInput = process.env
): RetentionSchedulerConfig {
  for (const key of Object.keys(env)) {
    if (key.startsWith("RETENTION_SCHEDULER_") && !SUPPORTED_SCHEDULER_ENV_KEYS.has(key)) {
      fail("unsupported_env_key");
    }
  }
  const enabledRaw = env[SCHEDULER_ENV_KEYS.enabled];
  if (enabledRaw !== undefined && enabledRaw !== "true" && enabledRaw !== "false") {
    fail("enabled_invalid");
  }
  const enabled = enabledRaw === "true";
  const intervalMs = parseBoundedMs(
    env[SCHEDULER_ENV_KEYS.intervalMs],
    DEFAULT_INTERVAL_MS,
    MIN_INTERVAL_MS,
    MAX_INTERVAL_MS,
    "interval_ms_invalid"
  );
  const initialJitterMs = parseBoundedMs(
    env[SCHEDULER_ENV_KEYS.initialJitterMs],
    DEFAULT_INITIAL_JITTER_MS,
    MIN_INITIAL_JITTER_MS,
    MAX_INITIAL_JITTER_MS,
    "initial_jitter_ms_invalid"
  );
  if (initialJitterMs > intervalMs) fail("initial_jitter_ms_exceeds_interval");
  const maxRunMs = parseBoundedMs(
    env[SCHEDULER_ENV_KEYS.maxRunMs],
    DEFAULT_MAX_RUN_MS,
    MIN_MAX_RUN_MS,
    MAX_MAX_RUN_MS,
    "max_run_ms_invalid"
  );
  if (maxRunMs >= intervalMs) fail("max_run_ms_exceeds_interval");
  return Object.freeze({ enabled, intervalMs, initialJitterMs, maxRunMs });
}

// ---------------------------------------------------------------------------
// Sanitized telemetry (the only shapes this scheduler ever logs)
// ---------------------------------------------------------------------------

export type RetentionFamilyTelemetry = Readonly<{
  family: string;
  status?: string;
  deleted?: number;
  matched?: number;
  batches?: number;
}>;

export type RetentionJobTelemetry = Readonly<{
  status: string;
  code?: string;
  /** The failing family identifier on `retention_family_failed` (contract :242-254). */
  failedFamily?: string;
  families: readonly RetentionFamilyTelemetry[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Lowercase identifier tokens only; anything else collapses to `redacted`. */
function sanitizeToken(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.length <= 64 && /^[a-z0-9_.:-]+$/.test(value) ? value : "redacted";
}

function firstToken(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const token = sanitizeToken(record[key]);
    if (token !== undefined) return token;
  }
  return undefined;
}

function firstCount(record: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  }
  return undefined;
}

const FAMILY_DELETED_KEYS = ["deleted", "deletedRows"] as const;
const FAMILY_MATCHED_KEYS = ["matched", "matchedRows"] as const;
const FAMILY_BATCH_KEYS = ["batches", "batchesRun", "committedBatches"] as const;

function sanitizeFamilyTelemetry(value: unknown): readonly RetentionFamilyTelemetry[] {
  if (!Array.isArray(value)) return [];
  const families: RetentionFamilyTelemetry[] = [];
  for (const raw of value.slice(0, MAX_TELEMETRY_FAMILIES)) {
    if (!isRecord(raw)) continue;
    families.push(
      Object.freeze({
        family: firstToken(raw, ["family", "familyId"]) ?? "unknown_family",
        status: firstToken(raw, ["status"]),
        deleted: firstCount(raw, FAMILY_DELETED_KEYS),
        matched: firstCount(raw, FAMILY_MATCHED_KEYS),
        batches: firstCount(raw, FAMILY_BATCH_KEYS),
      })
    );
  }
  return families;
}

/**
 * Projects the job summary onto the loggable subset. The summary's canonical
 * type is owned by the job-service leaf; this projection is deliberately
 * structural so a summary field that is not an allowlisted aggregate can
 * never reach a log, whatever the sibling leaf evolves into. `failedFamily`
 * travels too (contract :242-254 permits family identifiers): without it a
 * `retention_family_failed` line never names the family that failed. Like the
 * other optional fields it is omitted when the summary carries no usable
 * token (`null` on every non-failure status).
 */
export function sanitizeRetentionJobTelemetry(summary: unknown): RetentionJobTelemetry {
  if (!isRecord(summary)) {
    return Object.freeze({ status: "unknown", families: [] });
  }
  return Object.freeze({
    status: firstToken(summary, ["status"]) ?? "unknown",
    code: firstToken(summary, ["code", "errorCode"]),
    failedFamily: firstToken(summary, ["failedFamily", "failed_family"]),
    families: sanitizeFamilyTelemetry(summary["families"]),
  });
}

/**
 * Redacts an error for logging: allowlisted stable codes pass verbatim, the
 * scheduler's own typed configuration error passes as `code (reason)`, and
 * everything else — driver text, SQL fragments, paths, URLs — collapses to
 * one redacted token.
 */
export function sanitizeRetentionErrorForLog(error: unknown): string {
  if (error instanceof RetentionSchedulerConfigError) return error.message;
  if (error instanceof Error && LOGGABLE_ERROR_MESSAGES.has(error.message)) {
    return error.message;
  }
  return REDACTED_ERROR_TOKEN;
}

// ---------------------------------------------------------------------------
// Injected dependencies
// ---------------------------------------------------------------------------

/** One run receives exactly one participant-owned signal and one instant. */
export type RetentionPlanRunInput = Readonly<{ now: Date; signal: AbortSignal }>;

/**
 * The tick's job invocation. The summary's canonical type lives in the
 * job-service leaf; the scheduler consumes it only through
 * `sanitizeRetentionJobTelemetry`, so the result is typed `unknown` here.
 */
export type RetentionPlanRunner = (input: RetentionPlanRunInput) => Promise<unknown>;

/**
 * Cancel/drain hook for the currently active dedicated session.
 * `ShutdownReason` values are a subset of the client's
 * `DedicatedCancelReason` values, so the lifecycle reason is forwarded
 * verbatim. The hook's owner bounds its own SQL; this scheduler additionally
 * bounds the await by the shared drain deadline.
 */
export type RetentionSessionCancelHook = (
  reason: ShutdownReason
) => Promise<"rolled_back" | "connection_terminated">;

export type RetentionSchedulerLogger = Readonly<{
  info: (message: string, details: Record<string, unknown>) => void;
  warn: (message: string, details: Record<string, unknown>) => void;
  error: (message: string, details: Record<string, unknown>) => void;
}>;

export type RetentionSchedulerDeps = Readonly<{
  /** Environment record override; defaults to `process.env`. */
  env?: RetentionSchedulerEnvInput;
  /**
   * Job invocation; defaults to the sibling job-service leaf's plan runner,
   * bounded by this scheduler's parsed `maxRunMs`.
   */
  runRetentionPlan?: RetentionPlanRunner;
  /** Active-session cancel/drain hook; wired by the composition owner. */
  cancelActiveRetentionSession?: RetentionSessionCancelHook;
  /** Monotonic-enough millisecond clock; defaults to `Date.now`. */
  now?: () => number;
  /** Uniform `[0, 1)` jitter source; defaults to `Math.random`. */
  random?: () => number;
  /** Log sink; defaults to the prefixed `console` adapter below. */
  log?: RetentionSchedulerLogger;
}>;

const defaultLogger: RetentionSchedulerLogger = Object.freeze({
  info: (message, details) => console.info(`${LOG_PREFIX}${message}`, details),
  warn: (message, details) => console.warn(`${LOG_PREFIX}${message}`, details),
  error: (message, details) => console.error(`${LOG_PREFIX}${message}`, details),
});

/**
 * Default job binding, built per engine so the parsed budget travels with it.
 * The sibling job-service leaf owns `runRetentionPlan`'s canonical POSITIONAL
 * signature — `(now, signal, deps?)` — while this scheduler's runner contract
 * is object-shaped, so the two surfaces are adapted explicitly instead of
 * cast: the adapter forwards the leaf's own `now`/`signal` verbatim and hands
 * the job its `maxRunMs` from this scheduler's parsed
 * `RETENTION_SCHEDULER_MAX_RUN_MS` (C5: the job leaf never reads that key and
 * defensively bounds the value itself). The result is one publishable summary
 * or one bounded failure out. If either surface drifts, this is the one
 * function that must change.
 */
function createDefaultRunRetentionPlan(maxRunMs: number): RetentionPlanRunner {
  return async ({ now, signal }) => runRetentionPlan(now, signal, { maxRunMs });
}

// ---------------------------------------------------------------------------
// Scheduler controller surface
// ---------------------------------------------------------------------------

export type RetentionSchedulerController = Readonly<{
  readonly config: RetentionSchedulerConfig;
  /** Idempotent; awaited; disabled -> returns without any affinity work. */
  readonly start: () => Promise<void>;
  /** Manual tick for tests: respects non-overlap and the enabled gate. */
  readonly tick: () => Promise<void>;
  /** Idempotent stop + bounded drain; awaits tracked detached work. */
  readonly stop: (reason?: ShutdownReason) => Promise<void>;
}>;

type RetentionSchedulerEngine = Readonly<{
  config: RetentionSchedulerConfig;
  start: () => Promise<void>;
  tick: () => Promise<void>;
  close: (reason: ShutdownReason, context: RuntimeCloseContext) => Promise<void>;
  stop: (reason?: ShutdownReason) => Promise<void>;
  awaitDetachedDrains: () => Promise<void>;
}>;

type BoundedAwaitOutcome<T> =
  | Readonly<{ state: "settled"; value: T }>
  | Readonly<{ state: "rejected"; error: unknown }>
  | Readonly<{ state: "elapsed" }>;

/**
 * Shutdown-containment await: settles `promise` within `budgetMs`. The race
 * handler observes rejection even when the ceiling wins, so a losing promise
 * never becomes an unhandled rejection; the caller decides whether an
 * elapsed promise is tracked for a later awaited drain.
 */
async function awaitBounded<T>(
  promise: Promise<T>,
  budgetMs: number
): Promise<BoundedAwaitOutcome<T>> {
  let elapse: () => void = () => undefined;
  const ceiling = new Promise<Readonly<{ state: "elapsed" }>>((resolve) => {
    elapse = () => resolve({ state: "elapsed" });
  });
  const timer = setTimeout(elapse, Math.max(0, budgetMs));
  try {
    return await Promise.race([
      promise.then(
        (value): BoundedAwaitOutcome<T> => ({ state: "settled", value }),
        (error: unknown): BoundedAwaitOutcome<T> => ({ state: "rejected", error })
      ),
      ceiling,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

type SchedulerEngineState = {
  started: boolean;
  stopping: boolean;
  closed: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  startPromise: Promise<void> | null;
  runPromise: Promise<void> | null;
  runController: AbortController | null;
};

type TickTrigger = "interval" | "manual";

/**
 * The one engine behind both entry shapes. Parsing happens synchronously at
 * creation, so malformed or out-of-range configuration fails before any
 * timer, affinity, or connection work exists.
 */
function createRetentionSchedulerEngine(deps: RetentionSchedulerDeps): RetentionSchedulerEngine {
  const config = parseRetentionSchedulerEnv(deps.env ?? process.env);
  const now = deps.now ?? Date.now;
  const random = deps.random ?? Math.random;
  const runPlan = deps.runRetentionPlan ?? createDefaultRunRetentionPlan(config.maxRunMs);
  const log = deps.log ?? defaultLogger;

  const state: SchedulerEngineState = {
    started: false,
    stopping: false,
    closed: false,
    timer: null,
    startPromise: null,
    runPromise: null,
    runController: null,
  };
  /** Elapsed drains, re-awaited by `stop`/a later close (never abandoned). */
  const detachedDrains: Promise<void>[] = [];

  const clearTimer = (): void => {
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  };

  const installTimer = (delayMs: number): void => {
    if (state.stopping || state.closed) return;
    const timer = setTimeout(
      () => {
        state.timer = null;
        handleTimerFired();
      },
      Math.max(0, delayMs)
    );
    if (typeof timer.unref === "function") timer.unref(); // never hold the process open
    state.timer = timer;
  };

  const executeRun = async (controller: AbortController, trigger: TickTrigger): Promise<void> => {
    const startedAtMs = now();
    const durationMs = (): number => Math.max(0, now() - startedAtMs);
    try {
      const summary = await runPlan({
        now: new Date(startedAtMs),
        signal: controller.signal,
      });
      log.info("retention_scheduler_run_completed", {
        trigger,
        durationMs: durationMs(),
        ...sanitizeRetentionJobTelemetry(summary),
      });
    } catch (error) {
      // Correction C8: abort is a lifecycle outcome, not a failure code. The
      // job service owns the authoritative classification; the scheduler only
      // refuses to log a graceful abort (or a session loss caused by one) as
      // an error-level failure.
      if (controller.signal.aborted) {
        // Graceful shutdown: status `aborted` is a lifecycle outcome, never a
        // member of the closed failure-code set (correction C8b).
        log.info("retention_scheduler_run_aborted", {
          trigger,
          status: "aborted",
          durationMs: durationMs(),
          error: sanitizeRetentionErrorForLog(error),
        });
      } else {
        log.error("retention_scheduler_run_failed", {
          trigger,
          status: "failed",
          durationMs: durationMs(),
          error: sanitizeRetentionErrorForLog(error),
        });
      }
    }
  };

  const beginRun = (trigger: TickTrigger): Promise<void> | null => {
    if (state.stopping || state.closed || !state.started) {
      log.warn("retention_scheduler_tick_skipped", { trigger, reason: "not_running" });
      return null;
    }
    if (!config.enabled) {
      // Disabled schedulers perform zero job activity, even on a manual tick.
      log.warn("retention_scheduler_tick_skipped", { trigger, reason: "scheduler_disabled" });
      return null;
    }
    if (state.runPromise !== null) {
      // Strict non-overlap: a due tick during a live run is dropped here and
      // retried on the next interval (contract :98, :274).
      log.warn("retention_scheduler_tick_skipped", { trigger, reason: "run_active" });
      return null;
    }
    const controller = new AbortController(); // participant-owned, one per run
    const run = executeRun(controller, trigger); // never rejects
    state.runController = controller;
    state.runPromise = run;
    return run;
  };

  const finishRun = (run: Promise<void>): void => {
    if (state.runPromise === run) {
      state.runPromise = null;
      state.runController = null;
    }
  };

  const runTick = async (trigger: TickTrigger): Promise<void> => {
    const run = beginRun(trigger);
    if (run === null) return;
    try {
      await run;
    } finally {
      finishRun(run);
    }
  };

  const handleTimerFired = (): void => {
    try {
      // Fixed cadence measured from tick start; a run that outlives one
      // interval causes the next due tick to be dropped, not overlapped.
      installTimer(config.intervalMs);
      void runTick("interval");
    } catch (error) {
      // Synchronous scheduling failures are contained and redacted; they must
      // never crash the process (contract :98, :299-300).
      log.error("retention_scheduler_tick_scheduling_failed", {
        error: sanitizeRetentionErrorForLog(error),
      });
    }
  };

  const performStart = async (): Promise<void> => {
    if (state.closed || state.stopping) return;
    if (!config.enabled) {
      // Disabled: zero affinity probes, zero reservations, zero timers
      // (contract :128-132, :287-290). Ordinary startup stays valid.
      state.started = true;
      log.info("retention_scheduler_disabled", {});
      return;
    }
    // Enabled: await L02's lifecycle-memoized affinity proof BEFORE the timer
    // exists. Transaction-primary, transaction-pooled maintenance, PID drift,
    // lock re-entry, a missing URL, and an outage all reject here with the
    // stable client code and leave zero timer/job activity behind.
    await assertMaintenanceSessionAffinity();
    if (state.closed || state.stopping) return;
    state.started = true;
    const jitterDelayMs =
      config.initialJitterMs === 0 ? 0 : Math.floor(random() * (config.initialJitterMs + 1));
    installTimer(jitterDelayMs);
    log.info("retention_scheduler_started", {
      intervalMs: config.intervalMs,
      initialJitterMs: config.initialJitterMs,
      maxRunMs: config.maxRunMs,
      jitterDelayMs,
    });
  };

  const start = (): Promise<void> => {
    if (state.closed) return Promise.resolve();
    if (state.startPromise === null) {
      state.startPromise = performStart().catch((error: unknown) => {
        // Allow a later bounded retry (e.g. after lifecycle rollback); the
        // error propagates to the lifecycle, which fails startup closed.
        state.startPromise = null;
        throw error;
      });
    }
    return state.startPromise;
  };

  const close = async (reason: ShutdownReason, _context: RuntimeCloseContext): Promise<void> => {
    if (state.closed) return; // idempotent; the first close owns the drain
    state.closed = true;
    state.stopping = true;
    clearTimer(); // (1) stop ticks
    const controller = state.runController;
    controller?.abort(); // (2) abort-first precedence (correction C8)
    const drainDeadlineMs = now() + RETENTION_CANCEL_DRAIN_DEADLINE_MS;
    const remainingMs = (): number => Math.max(0, drainDeadlineMs - now());
    // (3) A start still proving affinity is contained too: no timer may be
    // installed mid-close and no probe promise may be left unobserved.
    const pendingStart = state.startPromise;
    if (pendingStart !== null) {
      const outcome = await awaitBounded(pendingStart, remainingMs());
      if (outcome.state === "elapsed") {
        detachedDrains.push(
          pendingStart.then(
            () => undefined,
            () => undefined
          )
        );
      }
    }
    // (4) Cancel active SQL through the session owner and confirm rollback or
    // backend termination before awaiting the run (contract :106-108, :144).
    let drainOutcome:
      "rolled_back" | "connection_terminated" | "unconfirmed" | "no_active_session" =
      "no_active_session";
    if (controller !== null && deps.cancelActiveRetentionSession) {
      const hook = await awaitBounded(deps.cancelActiveRetentionSession(reason), remainingMs());
      if (hook.state === "settled") {
        drainOutcome = hook.value;
      } else {
        drainOutcome = "unconfirmed";
        if (hook.state === "rejected") {
          log.error("retention_scheduler_session_drain_failed", {
            reason,
            error: sanitizeRetentionErrorForLog(hook.error),
          });
        }
      }
    }
    // (5) Await the run within the same absolute drain deadline.
    const run = state.runPromise;
    if (run !== null) {
      const outcome = await awaitBounded(run, remainingMs());
      if (outcome.state === "elapsed") {
        // The run is bounded by abort plus the tx-local 4,000 ms statement
        // bound, so elapsed here is diagnostic; the promise is still tracked
        // and re-awaited instead of being abandoned.
        detachedDrains.push(
          run.then(
            () => finishRun(run),
            () => finishRun(run)
          )
        );
        log.error("retention_scheduler_close_drain_elapsed", {
          reason,
          drainDeadlineMs: RETENTION_CANCEL_DRAIN_DEADLINE_MS,
        });
      } else {
        finishRun(run);
      }
    }
    log.info("retention_scheduler_closed", {
      reason,
      drainOutcome,
      hadActiveRun: controller !== null,
    });
  };

  const awaitDetachedDrains = async (): Promise<void> => {
    while (detachedDrains.length > 0) {
      const drain = detachedDrains.shift();
      if (drain) await drain;
    }
  };

  const stop = async (reason: ShutdownReason = "test"): Promise<void> => {
    // The lifecycle aborts the close-context signal before the first
    // participant close; the controller seam mirrors that shape exactly.
    const contextSignal = new AbortController();
    contextSignal.abort();
    await close(reason, {
      absoluteDeadline: now() + RETENTION_CANCEL_DRAIN_DEADLINE_MS,
      signal: contextSignal.signal,
    });
    await awaitDetachedDrains();
  };

  return {
    config,
    start,
    tick: () => runTick("manual"),
    close,
    stop,
    awaitDetachedDrains,
  };
}

// ---------------------------------------------------------------------------
// Exported entry shapes
// ---------------------------------------------------------------------------

/**
 * The runtime-lifecycle participant consumed (registered) solely by
 * TASK-551-08-L03. Fixed id/phase; awaited, idempotent start; awaited,
 * idempotent close. Configuration is parsed at factory time — composition —
 * so an invalid value fails startup before registration, traffic, timers, or
 * affinity work.
 */
export function createRetentionSchedulerLifecycleParticipant(
  deps: RetentionSchedulerDeps = {}
): RuntimeLifecycleParticipant {
  const engine = createRetentionSchedulerEngine(deps);
  return Object.freeze({
    id: RETENTION_SCHEDULER_PARTICIPANT_ID,
    phase: "worker",
    start: () => engine.start(),
    close: (reason, context) => engine.close(reason, context),
  });
}

/**
 * Standalone entry for hosts and suites outside the runtime lifecycle:
 * parse/validate first, then start (disabled -> controller with no timer and
 * zero affinity work; enabled -> affinity gate, then the timer). The
 * controller exposes stop/drain for tests.
 */
export async function startRetentionScheduler(
  deps: RetentionSchedulerDeps = {}
): Promise<RetentionSchedulerController> {
  const engine = createRetentionSchedulerEngine(deps);
  await engine.start();
  return Object.freeze({
    config: engine.config,
    start: () => engine.start(),
    tick: () => engine.tick(),
    stop: (reason?: ShutdownReason) => engine.stop(reason),
  });
}
