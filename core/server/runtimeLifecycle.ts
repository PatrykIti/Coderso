/**
 * Sole runtime lifecycle participant registry (TASK-551-02-L02).
 *
 * Exports exactly `registerRuntimeLifecycleParticipant`,
 * `startRuntimeLifecycle`, and `closeRuntimeLifecycle`. Registration is
 * side-effect-free; the registry starts database -> cache -> worker exactly
 * once, rolls back already-started participants on failure, closes in reverse
 * phase and registration order, and memoizes concurrent close calls.
 *
 * Close budgets: the stop-accepting -> worker -> cache -> database sequence
 * shares one absolute `GRACEFUL_SHUTDOWN_DEADLINE_MS` deadline. Every
 * non-database participant is capped at
 * `min(PARTICIPANT_CLOSE_DEADLINE_MS, remaining)`; the database phase is the
 * one explicit exemption and is never wrapped in an outer race (its own
 * `min(10s, remaining)` budget applies inside the database close). The close
 * context signal is aborted before the first participant close so a
 * cancellation-aware worker confirms SQL cancellation plus rollback or
 * backend termination inside its ceiling, and no timed-out close promise is
 * ever abandoned: an elapsed close is awaited before the shared close
 * resolves.
 */

export const RUNTIME_LIFECYCLE_ERROR_CODES = {
  duplicateId: "runtime_lifecycle_participant_id_conflict",
  lateRegistration: "runtime_lifecycle_registration_closed",
  startFailed: "runtime_lifecycle_start_failed",
  closeTimeout: "runtime_lifecycle_participant_close_timeout",
  closeFailure: "runtime_lifecycle_participant_close_failure",
} as const;

/** Non-database participants are capped at five seconds each. */
export const PARTICIPANT_CLOSE_DEADLINE_MS = 5_000;
/** The database close is the one explicit participant-limit exception. */
export const DATABASE_CLOSE_BUDGET_MS = 10_000;
/** One absolute deadline spans stop-accepting -> worker -> cache -> database. */
export const GRACEFUL_SHUTDOWN_DEADLINE_MS = 15_000;

/** Machine-readable bounded shutdown reasons. */
export type ShutdownReason = "signal" | "startup_failure" | "close_failure" | "test";

export type RuntimeLifecyclePhase = "database" | "cache" | "worker";

const PHASE_ORDER: readonly RuntimeLifecyclePhase[] = ["database", "cache", "worker"];

export type RuntimeCloseContext = Readonly<{
  absoluteDeadline: number;
  signal: AbortSignal;
}>;

export type RuntimeLifecycleParticipant = Readonly<{
  id: string;
  phase: RuntimeLifecyclePhase;
  start: () => Promise<void>;
  close: (reason: ShutdownReason, context: RuntimeCloseContext) => Promise<void>;
}>;

const participantsById = new Map<string, RuntimeLifecycleParticipant>();

/** Registration list in arrival order; started/phase-sorted at start time. */
const registrationOrder: RuntimeLifecycleParticipant[] = [];

let lifecycleState: "accepting" | "started" | "closed" = "accepting";
let closePromise: Promise<void> | null = null;
/** Participants whose start succeeded but which are not yet closed. */
const startedStack: RuntimeLifecycleParticipant[] = [];

/**
 * Bounded close diagnostics: participant ids only, never raw error text. A
 * close that outlived its ceiling lands in `timedOut`; a close that rejected
 * lands in `failed`.
 */
const closeTimeoutIds: string[] = [];
const closeFailureIds: string[] = [];

/**
 * The cancellation ceiling for one participant phase against the shared
 * absolute shutdown deadline. The database phase reports its explicit
 * `min(10s, remaining)` exception; every other phase is capped at five
 * seconds.
 */
export function participantCloseBudgetMs(
  phase: RuntimeLifecyclePhase,
  absoluteDeadline: number,
  now: number = Date.now()
): number {
  const remainingMs = Math.max(0, absoluteDeadline - now);
  return phase === "database"
    ? Math.min(DATABASE_CLOSE_BUDGET_MS, remainingMs)
    : Math.min(PARTICIPANT_CLOSE_DEADLINE_MS, remainingMs);
}

/**
 * Creates the one absolute shutdown deadline shared by the whole
 * stop-accepting -> worker -> cache -> database sequence. The entrypoint owner
 * calls this once, before the HTTP drain starts, so drain time is charged to
 * the same budget instead of leaving a fresh 15 seconds for the close phases.
 */
export function createShutdownAbsoluteDeadline(now: number = Date.now()): number {
  return now + GRACEFUL_SHUTDOWN_DEADLINE_MS;
}

/** Bounded close diagnostics for operations surfaces (ids only). */
export function getRuntimeLifecycleCloseTimeouts(): readonly string[] {
  return closeTimeoutIds;
}

/** Bounded close diagnostics for operations surfaces (ids only). */
export function getRuntimeLifecycleCloseFailures(): readonly string[] {
  return closeFailureIds;
}

/**
 * Registers one participant exactly once before lifecycle start. Duplicate
 * IDs and registration after start or close ("late") fail closed with
 * machine-readable codes.
 */
export function registerRuntimeLifecycleParticipant(
  participant: RuntimeLifecycleParticipant
): void {
  if (lifecycleState !== "accepting") {
    throw new Error(RUNTIME_LIFECYCLE_ERROR_CODES.lateRegistration);
  }
  if (participantsById.has(participant.id)) {
    throw new Error(RUNTIME_LIFECYCLE_ERROR_CODES.duplicateId);
  }
  participantsById.set(participant.id, participant);
  registrationOrder.push(participant);
}

function sortedParticipants(): RuntimeLifecycleParticipant[] {
  return [...registrationOrder].sort(
    (a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)
  );
}

type CloseContext = RuntimeCloseContext & { controller: AbortController };

/**
 * Uses the entrypoint-supplied deadline when it is a finite number so the
 * whole shutdown sequence shares one clock; otherwise the close creates its
 * own (the startup-failure and in-startup paths never drained anything).
 */
function createCloseContext(absoluteDeadline?: number): CloseContext {
  const controller = new AbortController();
  return {
    absoluteDeadline:
      typeof absoluteDeadline === "number" && Number.isFinite(absoluteDeadline)
        ? absoluteDeadline
        : createShutdownAbsoluteDeadline(),
    signal: controller.signal,
    controller,
  };
}

async function rollbackStarted(reason: ShutdownReason, context: CloseContext): Promise<void> {
  // Rollback aborts the shared close signal first, then awaits every
  // already-started participant to terminal state; it never abandons a live
  // close and never masks the original startup failure.
  context.controller.abort();
  while (startedStack.length > 0) {
    const participant = startedStack.pop();
    if (!participant) break;
    try {
      await participant.close(reason, context);
    } catch {
      // Bounded category; rollback is best-effort.
      closeFailureIds.push(participant.id);
    }
  }
}

/** Starts every registered participant once, database -> cache -> worker. */
export async function startRuntimeLifecycle(): Promise<void> {
  if (lifecycleState !== "accepting") return;
  const ordered = sortedParticipants();
  for (const participant of ordered) {
    try {
      await participant.start();
      startedStack.push(participant);
    } catch (error) {
      await rollbackStarted("startup_failure", createCloseContext());
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
  lifecycleState = "started";
}

/**
 * Awaits one participant close. The database phase is awaited without an
 * outer race (its own budget applies inside the close); every other phase is
 * raced against its ceiling, and a close that outlives the ceiling is pushed
 * onto `detached` so it is still awaited before the shared close resolves.
 */
async function closeParticipantBounded(
  participant: RuntimeLifecycleParticipant,
  reason: ShutdownReason,
  context: CloseContext,
  detachedCloses: Promise<void>[]
): Promise<"closed" | "elapsed"> {
  const close = participant.close(reason, context).then(() => undefined);
  if (participant.phase === "database") {
    // Sole participant-limit exemption: no outer 5-second race, and the
    // driver-level forced path inside the database close still awaits a
    // terminal outcome. A rejection is contained as a bounded diagnostic so
    // the graceful close itself stays terminal.
    try {
      await close;
    } catch {
      closeFailureIds.push(participant.id);
    }
    return "closed";
  }
  let elapse = (): void => {};
  const ceiling = new Promise<"elapsed">((resolve) => {
    elapse = () => resolve("elapsed");
  });
  const timer = setTimeout(
    elapse,
    participantCloseBudgetMs(participant.phase, context.absoluteDeadline)
  );
  try {
    const winner = await Promise.race([close.then((): "closed" => "closed"), ceiling]);
    if (winner === "closed") return "closed";
    detachedCloses.push(close);
    return "elapsed";
  } catch {
    // Bounded category without raw error text; later participants still close.
    closeFailureIds.push(participant.id);
    return "closed";
  } finally {
    clearTimeout(timer);
  }
}

async function runClose(reason: ShutdownReason, absoluteDeadline?: number): Promise<void> {
  const context = createCloseContext(absoluteDeadline);
  // Participant close aborts the shared signal first: cancellation-aware
  // workers observe it before their close callback and confirm SQL
  // cancellation plus rollback/termination inside their own ceiling.
  context.controller.abort();
  const detachedCloses: Promise<void>[] = [];
  try {
    while (startedStack.length > 0) {
      const participant = startedStack[startedStack.length - 1];
      if (!participant) break;
      const outcome = await closeParticipantBounded(participant, reason, context, detachedCloses);
      if (outcome === "elapsed") closeTimeoutIds.push(participant.id);
      startedStack.pop();
    }
  } finally {
    lifecycleState = "closed";
    // Nothing is left detached: a close that outlived its ceiling is awaited
    // here, before the shared close promise resolves.
    if (detachedCloses.length > 0) await Promise.allSettled(detachedCloses);
  }
}

/**
 * Closes all started participants in reverse phase and registration order.
 * Concurrent calls memoize onto one awaited terminal close. `absoluteDeadline`
 * seeds the shared shutdown clock when the caller already started the
 * sequence (the entrypoint passes the deadline it created before the drain);
 * without it the close starts a fresh 15-second budget.
 */
export function closeRuntimeLifecycle(
  reason: ShutdownReason,
  options?: { absoluteDeadline?: number }
): Promise<void> {
  if (lifecycleState === "closed") return Promise.resolve();
  if (closePromise) return closePromise;
  closePromise = runClose(reason, options?.absoluteDeadline);
  return closePromise;
}

/** Test-only deterministic reset of the module-scoped registry. */
export function resetRuntimeLifecycleForTests(): void {
  participantsById.clear();
  registrationOrder.length = 0;
  startedStack.length = 0;
  closeTimeoutIds.length = 0;
  closeFailureIds.length = 0;
  lifecycleState = "accepting";
  closePromise = null;
}
