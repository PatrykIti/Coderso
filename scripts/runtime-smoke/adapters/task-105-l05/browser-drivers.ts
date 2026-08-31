import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SmokeError,
  serializePublicSmokeFailure,
  type Task105L05WorkerFailurePhase,
} from "../../contracts";
import type { LifecycleResource, RuntimeSmokeContext } from "../../lifecycle";
import {
  WorkerDispatchError,
  WorkerProtocolError,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationDescriptor,
} from "../../workers/contracts";
import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import { Task105L05PageObserver, type Task105L05SegmentContext } from "./browser-segments";
import { Task105L05SettingsLease, validateTask105L05AdminBase } from "./settings-lease";
import {
  Task105L05FixtureCleanup,
  createTask105L05CleanupDeps,
  createTask105L05CleanupOwnershipCell,
  type Task105L05CleanupOwnershipCell,
} from "./cleanup";
import { TASK105_L05_WORKER_DESCRIPTORS, createTask105L05WorkerPool } from "./worker-operations";
import {
  validateTask105L05InstallOutput,
  type Task105L05InstallOutput,
} from "./worker-fixture-operations";
import {
  createTask105L05RecoveryAuthority,
  type Task105L05RecoveryAuthority,
} from "./recovery-receipt";
import { startTask105L05DevHost } from "./host";
import {
  TASK105_L05_DRIVER_SEGMENTS,
  TASK105_L05_PUBLIC_ORIGIN,
  TASK105_L05_TAB_A,
  TASK105_L05_TAB_B,
  Task105L05CliDriverCoordinator,
  Task105L05CliPageDriver,
  createTask105L05InjectedObserver,
  instrumentTask105L05Page,
  requireWorkerFlag,
  snapshotVisibleEvidence,
  type Task105L05InjectedObserver,
  type Task105L05ObserverDispatcher,
  type Task105L05VisibleEvidence,
} from "./browser-page-driver";

export { TASK105_L05_PUBLIC_ORIGIN, createTask105L05InjectedObserver };
export type { Task105L05InjectedObserver, Task105L05ObserverDispatcher, Task105L05VisibleEvidence };

/** Real supervised Playwright wiring; dynamic browser details remain private. */
function workerFailureCode(
  phase: Task105L05WorkerFailurePhase,
  error: unknown
):
  | "worker_dispatch_failed"
  | "worker_protocol_failed"
  | "worker_unavailable"
  | "worker_close_failed" {
  if (phase === "close") return "worker_close_failed";
  if (error instanceof WorkerProtocolError) return "worker_protocol_failed";
  if (error instanceof WorkerDispatchError && !error.dispatched) return "worker_unavailable";
  return "worker_dispatch_failed";
}
/** Closed worker failure projection; it never reads message, cause, stack, frames, or private receipt values. */
export function projectTask105L05WorkerFailure(
  phase: Task105L05WorkerFailurePhase,
  error: unknown
): SmokeError {
  const publicFailure = serializePublicSmokeFailure({
    boundary: "worker",
    phase,
    stableCode: workerFailureCode(phase, error),
  });
  return new SmokeError(publicFailure.code, publicFailure.message);
}
/** Live parent authority permits one in-process recovery/proof, never mutation replay. */
class Task105L05LiveRecovery {
  readonly #pool: Awaited<ReturnType<typeof createTask105L05WorkerPool>>;
  readonly #authority: Task105L05RecoveryAuthority;
  #authorityLive = true;
  constructor(input: {
    readonly pool: Awaited<ReturnType<typeof createTask105L05WorkerPool>>;
    readonly authority: Task105L05RecoveryAuthority;
  }) {
    this.#pool = input.pool;
    this.#authority = input.authority;
  }
  async dispatch(
    phase: Task105L05WorkerFailurePhase,
    descriptor: WorkerOperationDescriptor,
    input: PlainJsonObject
  ): Promise<PlainJsonValue> {
    if (!this.#authorityLive) {
      throw projectTask105L05WorkerFailure(
        phase,
        new WorkerDispatchError("worker unavailable", false)
      );
    }
    try {
      return await this.#pool.dispatch(descriptor, input);
    } catch (error) {
      if (error instanceof WorkerDispatchError && error.dispatched && this.#authorityLive) {
        await this.#recoverResponseUnknown();
      }
      throw projectTask105L05WorkerFailure(phase, error);
    }
  }
  async recover(): Promise<void> {
    if (!this.#authorityLive) {
      throw projectTask105L05WorkerFailure(
        "settings_restore",
        new WorkerDispatchError("worker unavailable", false)
      );
    }
    try {
      const output = await this.#pool.dispatch(TASK105_L05_WORKER_DESCRIPTORS.recover, {
        authority: this.#authority,
      });
      requireWorkerFlag(output, "recovered");
    } catch (error) {
      throw projectTask105L05WorkerFailure("settings_restore", error);
    }
  }
  async proveAbsent(): Promise<void> {
    if (!this.#authorityLive) {
      throw projectTask105L05WorkerFailure(
        "close",
        new WorkerDispatchError("worker unavailable", false)
      );
    }
    try {
      const output = await this.#pool.dispatch(TASK105_L05_WORKER_DESCRIPTORS.proveAbsent, {
        authority: this.#authority,
      });
      requireWorkerFlag(output, "absent");
    } catch (error) {
      throw projectTask105L05WorkerFailure("close", error);
    }
  }
  releaseAuthority(): void {
    this.#authorityLive = false;
  }
  async #recoverResponseUnknown(): Promise<void> {
    try {
      await this.recover();
      await this.proveAbsent();
    } catch {
      // The primary is already projected through the closed serializer. A
      // failed recovery remains a lifecycle cleanup failure, never raw output.
    }
  }
}
/** Keeps the TASK-105 close path in the closed public failure vocabulary. */
class Task105L05WorkerPoolResource implements LifecycleResource {
  readonly name = "task-105-l05-worker-pool";
  readonly #pool: Awaited<ReturnType<typeof createTask105L05WorkerPool>>;
  constructor(pool: Awaited<ReturnType<typeof createTask105L05WorkerPool>>) {
    this.#pool = pool;
  }
  async close(): Promise<void> {
    try {
      await this.#pool.close();
    } catch (error) {
      throw projectTask105L05WorkerFailure("close", error);
    }
  }
  async proveAbsent(): Promise<boolean> {
    try {
      return await this.#pool.proveAbsent();
    } catch {
      return false;
    }
  }
}
/** Private per-session workspace owns storage state and screenshot candidates. */
export class Task105L05Workspace implements LifecycleResource {
  readonly name = "task-105-l05-workspace";
  readonly #path: string;
  readonly storageStatePath: string;
  readonly screenshotCandidateRoot: string;
  private constructor(path: string) {
    this.#path = path;
    this.storageStatePath = resolve(path, "admin-storage-state.json");
    this.screenshotCandidateRoot = resolve(path, "screenshot-candidates");
  }
  get path(): string {
    return this.#path;
  }
  static async create(root: string, session: string): Promise<Task105L05Workspace> {
    const parent = resolve(root, "_docs/_workflows/_smoke/task-105-l05/workspaces");
    await mkdir(parent, { recursive: true });
    const path = resolve(parent, session);
    try {
      await mkdir(path, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new SmokeError(
          "smoke_process_failed",
          "TASK-105 L05 workspace already exists for this session"
        );
      }
      throw error;
    }
    const workspace = new Task105L05Workspace(path);
    await mkdir(workspace.screenshotCandidateRoot, { mode: 0o700 });
    return workspace;
  }
  async close(): Promise<void> {
    await rm(this.#path, { recursive: true, force: true, maxRetries: 2 });
  }
  async proveAbsent(): Promise<boolean> {
    try {
      await rm(this.#path, { recursive: true, force: true, maxRetries: 2 });
      return true;
    } catch {
      return false;
    }
  }
}
export class Task105L05DispatchResource implements LifecycleResource {
  readonly name = "task-105-l05-browser-dispatch";
  readonly #dispatcher: Pick<PlaywrightCliDispatcher, "close" | "proveAbsent">;
  readonly #observer: Task105L05InjectedObserver;
  #close: Promise<void> | null = null;
  constructor(
    dispatcher: Pick<PlaywrightCliDispatcher, "close" | "proveAbsent">,
    observer: Task105L05InjectedObserver
  ) {
    this.#dispatcher = dispatcher;
    this.#observer = observer;
  }
  async close(): Promise<void> {
    this.#close ??= this.#closeOnce();
    return this.#close;
  }
  async proveAbsent(): Promise<boolean> {
    return this.#observer.isDisposed() && (await this.#dispatcher.proveAbsent());
  }
  async #closeOnce(): Promise<void> {
    try {
      await this.#observer.dispose();
    } finally {
      await this.#dispatcher.close();
    }
  }
}
export interface Task105L05DriverRuntime {
  readonly session: string;
  readonly lease: Task105L05SettingsLease;
  readonly cell: Task105L05CleanupOwnershipCell;
  readonly workspacePath: string;
  readonly storageStatePath: string;
  readonly screenshotCandidateRoot: string;
  readonly getVisibleEvidence: () => readonly Task105L05VisibleEvidence[];
}

/**
 * Validates context and wires Page A only. `openPageB` is deliberately one-shot
 * and creates the second authenticated tab only after the segment plan creates
 * Page A's dirty dashboard draft.
 */
export async function wireTask105L05PageDrivers(
  context: RuntimeSmokeContext,
  adminBase: string
): Promise<{
  readonly pageA: Task105L05SegmentContext;
  readonly openPageB: () => Promise<Task105L05SegmentContext>;
  readonly runtime: Task105L05DriverRuntime;
}> {
  const session = context?.input?.session;
  if (typeof session !== "string" || !/^[a-z0-9][a-z0-9_-]{2,47}$/u.test(session)) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L05 driver session is invalid");
  }
  if (
    typeof context.root !== "string" ||
    context.root.length === 0 ||
    typeof context.lifecycle?.assertAccepting !== "function" ||
    typeof context.processes?.start !== "function"
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L05 driver context is invalid");
  }
  validateTask105L05AdminBase(session, adminBase);
  context.lifecycle.assertAccepting();
  if (typeof process.env.DATABASE_URL !== "string" || process.env.DATABASE_URL.length === 0) {
    throw new SmokeError(
      "smoke_adapter_unavailable",
      "TASK-105 L05 runtime requires DATABASE_URL before drivers can open"
    );
  }

  const authority = createTask105L05RecoveryAuthority({ profile: context.input.profile, session });
  let pool: Awaited<ReturnType<typeof createTask105L05WorkerPool>>;
  try {
    // The database-bearing worker registers first, before any durable fixture
    // workspace or aggregate cleanup resource exists.
    pool = await createTask105L05WorkerPool(context);
  } catch (error) {
    throw projectTask105L05WorkerFailure("spawn", error);
  }
  const recovery = new Task105L05LiveRecovery({ pool, authority });
  context.lifecycle.register(new Task105L05WorkerPoolResource(pool));
  const workspace = await Task105L05Workspace.create(context.root, session);
  const lease = new Task105L05SettingsLease({
    applyPrivate: async ({ rows }) => {
      const output = await recovery.dispatch(
        "settings_apply",
        TASK105_L05_WORKER_DESCRIPTORS.settingsApply,
        {
          authority,
          operation: "apply",
          rows: rows.map((row) => ({ key: row.key, valueJson: row.valueJson })),
        }
      );
      requireWorkerFlag(output, "applied");
    },
    claimPrivate: async ({ navigationMenuId }) => {
      const output = await recovery.dispatch(
        "settings_apply",
        TASK105_L05_WORKER_DESCRIPTORS.settingsApply,
        {
          authority,
          operation: "site-shell-claim",
          navigationMenuId,
        }
      );
      requireWorkerFlag(output, "claimed");
    },
    restorePrivate: async () => {
      const output = await recovery.dispatch(
        "settings_restore",
        TASK105_L05_WORKER_DESCRIPTORS.settingsRestore,
        {
          authority,
        }
      );
      requireWorkerFlag(output, "restored");
    },
  });
  const cell = createTask105L05CleanupOwnershipCell();
  const cleanupDeps = createTask105L05CleanupDeps(cell, { restoreLease: () => lease.restore() });
  const cleanup = new Task105L05FixtureCleanup({
    deps: cleanupDeps,
    cell,
    recovery: {
      recover: () => recovery.recover(),
      proveAbsent: () => recovery.proveAbsent(),
      invalidateSiteShellCaches: () => cleanupDeps.invalidateSiteShellCaches(),
    },
  });
  // Register the workspace before cleanup so reverse-order shutdown runs
  // cleanup while its private storage state is still available.
  context.lifecycle.register(workspace);
  context.lifecycle.register(cleanup);
  cell.storageStatePath = workspace.storageStatePath;

  const install = validateTask105L05InstallOutput(
    await recovery.dispatch("install", TASK105_L05_WORKER_DESCRIPTORS.install, {
      authority,
      session,
      workspacePath: workspace.path,
      storageStatePath: workspace.storageStatePath,
      adminBase,
      expectedAdminPath: adminBase,
    })
  ) as Task105L05InstallOutput;
  cell.fixturePageId = install.fixturePage.id;

  await lease.snapshotAndApply({ session, homepageId: install.fixturePage.id });
  cell.leaseApplied = true;
  await startTask105L05DevHost(context, { adminBase });

  const dispatcher = new PlaywrightCliDispatcher({
    context,
    session,
    workspace: workspace.path,
    segments: TASK105_L05_DRIVER_SEGMENTS,
    runCodeTimeoutMs: 300_000,
  });
  const coordinator = new Task105L05CliDriverCoordinator(dispatcher, session);
  const injectedObserver = createTask105L05InjectedObserver(coordinator, { session });
  const visibleEvidence: Task105L05VisibleEvidence[] = [];
  context.lifecycle.register(new Task105L05DispatchResource(dispatcher, injectedObserver));
  await dispatcher.loadStorageState(workspace.storageStatePath);

  await dispatcher.dispatchNative({ operation: "tab-new", url: `${TASK105_L05_PUBLIC_ORIGIN}/` });
  await dispatcher.dispatchNative({ operation: "tab-select", index: TASK105_L05_TAB_A });
  coordinator.markActive(TASK105_L05_TAB_A);
  const observerA = new Task105L05PageObserver();
  await instrumentTask105L05Page(injectedObserver, TASK105_L05_TAB_A, "a", adminBase);
  const pageADriver = new Task105L05CliPageDriver({
    coordinator,
    tabIndex: TASK105_L05_TAB_A,
    segmentId: "a",
    session,
    adminBase,
    candidateRoot: workspace.screenshotCandidateRoot,
    profile: context.input.profile,
    observer: observerA,
    visibleEvidence,
    prepareSiteShellMutation: async () => {
      const output = await recovery.dispatch(
        "settings_apply",
        TASK105_L05_WORKER_DESCRIPTORS.settingsApply,
        {
          authority,
          operation: "site-shell-intent",
        }
      );
      requireWorkerFlag(output, "prepared");
    },
  });
  await pageADriver.navigateAndSealInitial("menus");
  const pageA: Task105L05SegmentContext = Object.freeze({
    fixturePage: install.fixturePage,
    driver: pageADriver,
    observer: observerA,
  });

  let pageB: Task105L05SegmentContext | null = null;
  const openPageB = async (): Promise<Task105L05SegmentContext> => {
    if (pageB !== null) {
      throw new SmokeError("smoke_output_invalid", "TASK-105 L05 Page B was opened more than once");
    }
    await dispatcher.dispatchNative({ operation: "tab-new", url: `${TASK105_L05_PUBLIC_ORIGIN}/` });
    await dispatcher.dispatchNative({ operation: "tab-select", index: TASK105_L05_TAB_B });
    coordinator.markActive(TASK105_L05_TAB_B);
    const observerB = new Task105L05PageObserver();
    await instrumentTask105L05Page(injectedObserver, TASK105_L05_TAB_B, "b", adminBase);
    const pageBDriver = new Task105L05CliPageDriver({
      coordinator,
      tabIndex: TASK105_L05_TAB_B,
      segmentId: "b",
      session,
      adminBase,
      candidateRoot: workspace.screenshotCandidateRoot,
      profile: context.input.profile,
      observer: observerB,
      visibleEvidence,
      prepareSiteShellMutation: async () => {
        const output = await recovery.dispatch(
          "settings_apply",
          TASK105_L05_WORKER_DESCRIPTORS.settingsApply,
          {
            authority,
            operation: "site-shell-intent",
          }
        );
        requireWorkerFlag(output, "prepared");
      },
    });
    await pageBDriver.navigateAndSealInitial("dashboard");
    pageB = Object.freeze({
      fixturePage: install.fixturePage,
      driver: pageBDriver,
      observer: observerB,
    });
    return pageB;
  };

  return Object.freeze({
    pageA,
    openPageB,
    runtime: Object.freeze({
      session,
      lease,
      cell,
      workspacePath: workspace.path,
      storageStatePath: workspace.storageStatePath,
      screenshotCandidateRoot: workspace.screenshotCandidateRoot,
      getVisibleEvidence: () => snapshotVisibleEvidence(visibleEvidence),
    }),
  });
}
