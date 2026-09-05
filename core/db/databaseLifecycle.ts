/**
 * Deadline-bounded database lifecycle integration (TASK-551-02-L02).
 *
 * Registers the sole `database` phase participant with
 * `core/server/runtimeLifecycle.ts` and owns the explicit database-close
 * exception: the distinct client set receives at most
 * `min(10s, absoluteShutdownDeadline - now)` total, never a nested outer
 * 5-second race, and every end/termination is awaited to terminal state.
 *
 * The concrete client module is loaded lazily so importing this module (and
 * therefore the lifecycle registry) never opens a database client or requires
 * `DATABASE_URL`; tests can inject a fake module through
 * `setDatabaseClientModuleForTests`.
 */
import {
  GRACEFUL_SHUTDOWN_DEADLINE_MS,
  PARTICIPANT_CLOSE_DEADLINE_MS,
  registerRuntimeLifecycleParticipant,
  type RuntimeCloseContext,
  type ShutdownReason,
} from "../server/runtimeLifecycle";
import { POOL_ACQUISITION_DEADLINE_MS } from "./queryTelemetry";

export { POOL_ACQUISITION_DEADLINE_MS };
export { GRACEFUL_SHUTDOWN_DEADLINE_MS, PARTICIPANT_CLOSE_DEADLINE_MS };

/** The database close is the one explicit participant-limit exception. */
export const DATABASE_CLOSE_TIMEOUT_SECONDS = 10;
export const HTTP_DRAIN_DEADLINE_MS = 10_000;
export const RETENTION_CANCEL_DRAIN_DEADLINE_MS = 4_500;
export const RETENTION_STATEMENT_TIMEOUT_MS = 4_000;

/** Shape of `core/db/client.ts` this module depends on (lazy). */
export type DatabaseClientModule = {
  verifyDatabaseSessions(): Promise<void>;
  assertMaintenanceSessionAffinity(): Promise<void>;
  assertMaintenanceSessionAffinityIfDeclared(): Promise<void>;
  closeAllDatabaseClientsWithin(budgetMs: number): Promise<void>;
  listDatabaseClients(): readonly unknown[];
};

let loader: () => Promise<DatabaseClientModule> = () =>
  import("./client") as Promise<DatabaseClientModule>;

/**
 * Test-only seam replacing the lazy client-module loader. Pass `null` to
 * restore production behavior.
 */
export function setDatabaseClientModuleForTests(
  next: (() => Promise<DatabaseClientModule>) | null
): void {
  loader =
    next ??
    ((): Promise<DatabaseClientModule> => import("./client") as Promise<DatabaseClientModule>);
}

async function loadClientModule(): Promise<DatabaseClientModule> {
  return loader();
}

/**
 * Closes every distinct database client within
 * `min(DATABASE_CLOSE_TIMEOUT_SECONDS, remaining global time)` milliseconds.
 */
export async function closeAllDatabaseClientsWithinAbsoluteDeadline(
  absoluteDeadline: number
): Promise<void> {
  const remainingMs = Math.max(0, absoluteDeadline - Date.now());
  const budgetMs = Math.min(DATABASE_CLOSE_TIMEOUT_SECONDS * 1_000, remainingMs);
  const clientModule = await loadClientModule();
  await clientModule.closeAllDatabaseClientsWithin(budgetMs);
}

let registered = false;

/**
 * Registers the `database` participant exactly once per process. Ordinary
 * primary-mode startup verifies connectivity without consuming a second
 * connection merely to prove an unused maintenance capability; an explicitly
 * declared `direct|session` channel is an infrastructure declaration and its
 * live affinity proof runs once at startup.
 */
export function registerDatabaseLifecycleParticipant(): void {
  if (registered) return;
  registerRuntimeLifecycleParticipant({
    id: "database",
    phase: "database",
    start: async () => {
      const clientModule = await loadClientModule();
      await clientModule.verifyDatabaseSessions();
      // Primary mode does not probe at ordinary database-participant start.
      await clientModule.assertMaintenanceSessionAffinityIfDeclared();
    },
    close: async (_reason: ShutdownReason, context: RuntimeCloseContext) => {
      await closeAllDatabaseClientsWithinAbsoluteDeadline(context.absoluteDeadline);
    },
  });
  registered = true;
}

/** Test-only deterministic reset of this module's registration flag. */
export function resetDatabaseLifecycleForTests(): void {
  registered = false;
}
