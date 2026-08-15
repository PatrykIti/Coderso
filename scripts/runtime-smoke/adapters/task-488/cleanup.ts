import { SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeLifecycle } from "../../lifecycle";
import type { RepositoryGuard, RepositorySnapshot } from "../../repository-guard";
import type { WorkerOperationDescriptor } from "../../workers/contracts";
import type { WorkerPool } from "../../workers/pool";
import type {
  Task488CleanupOutput,
  Task488ProofInput,
  Task488ProofOutput,
} from "./worker-operations";

export interface Task488WorkerCleanupDescriptors {
  readonly cleanup: WorkerOperationDescriptor;
  readonly prove: WorkerOperationDescriptor;
}

export interface Task488CleanupInputs {
  readonly productSlug: string;
  readonly collectionSlug: string;
  readonly adminPath: string;
}

export interface Task488FinalCleanupProof {
  readonly cleanup: Task488CleanupOutput;
  readonly terminal: Task488ProofOutput;
}

export interface Task488FinalizationFailure {
  readonly resource: string;
  readonly phase: "close" | "absence" | "terminal-proof";
  readonly error: unknown;
}

export interface Task488FinalizationResult {
  readonly proof: Task488FinalCleanupProof | null;
  readonly failures: readonly Task488FinalizationFailure[];
}

class Task488CleanupResource implements LifecycleResource {
  readonly name = "task488-fixture-cleanup";
  readonly #workers: WorkerPool;
  readonly #descriptor: WorkerOperationDescriptor;
  readonly #input: Readonly<{ readonly productSlug: string; readonly collectionSlug: string }>;
  #output: Task488CleanupOutput | null = null;
  #closePromise: Promise<void> | null = null;

  constructor(
    workers: WorkerPool,
    descriptor: WorkerOperationDescriptor,
    input: Readonly<{ readonly productSlug: string; readonly collectionSlug: string }>
  ) {
    this.#workers = workers;
    this.#descriptor = descriptor;
    this.#input = Object.freeze({ ...input });
  }

  output(): Task488CleanupOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closePromise ??= this.#closeOnce();
    return this.#closePromise;
  }

  async #closeOnce(): Promise<void> {
    const output = (await this.#workers.dispatch(
      this.#descriptor,
      Object.freeze({ ...this.#input })
    )) as Task488CleanupOutput;
    if (
      output.schemaVersion !== 1 ||
      output.deletedProducts < 0 ||
      output.deletedCollections < 0 ||
      output.deletedProducts > 1 ||
      output.deletedCollections > 1
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-488 fixture cleanup is incomplete");
    }
    this.#output = output;
    this.#workers.recordDatabaseBatch(output.statements, output.rows);
  }

  async proveAbsent(): Promise<boolean> {
    return this.#output !== null;
  }
}

export function createTask488CleanupResources(input: {
  readonly lifecycle: RuntimeLifecycle;
  readonly workers: WorkerPool;
  readonly descriptors: Task488WorkerCleanupDescriptors;
  readonly fixtureInputs: Task488CleanupInputs;
}): Task488CleanupResource {
  const cleanup = new Task488CleanupResource(input.workers, input.descriptors.cleanup, {
    productSlug: input.fixtureInputs.productSlug,
    collectionSlug: input.fixtureInputs.collectionSlug,
  });
  input.lifecycle.register(cleanup);
  return cleanup;
}

async function closeAndProve(
  resource: LifecycleResource | null,
  failures: Task488FinalizationFailure[]
): Promise<void> {
  if (resource === null) return;
  try {
    await resource.close();
  } catch (error) {
    failures.push(Object.freeze({ resource: resource.name, phase: "close", error }));
  }
  try {
    if (!(await resource.proveAbsent())) {
      failures.push(
        Object.freeze({
          resource: resource.name,
          phase: "absence",
          error: new SmokeError("smoke_cleanup_failed", `${resource.name} remains active`),
        })
      );
    }
  } catch (error) {
    failures.push(Object.freeze({ resource: resource.name, phase: "absence", error }));
  }
}

export async function finalizeTask488ResourcesNeverThrow(input: {
  readonly browser: LifecycleResource | null;
  readonly workspace: LifecycleResource | null;
  readonly server: LifecycleResource | null;
  readonly cleanup: Task488CleanupResource | null;
  readonly workers: WorkerPool;
  readonly proofDescriptor: WorkerOperationDescriptor;
  readonly proofInput?: Task488ProofInput;
}): Promise<Task488FinalizationResult> {
  const failures: Task488FinalizationFailure[] = [];
  await closeAndProve(input.browser, failures);
  await closeAndProve(input.workspace, failures);
  await closeAndProve(input.server, failures);
  await closeAndProve(input.cleanup, failures);

  let terminal: Task488ProofOutput | null = null;
  if (input.cleanup !== null && input.proofInput !== undefined) {
    try {
      terminal = (await input.workers.dispatch(
        input.proofDescriptor,
        Object.freeze({ ...input.proofInput })
      )) as Task488ProofOutput;
      input.workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.schemaVersion !== 1 ||
        terminal.productAbsent !== true ||
        terminal.collectionAbsent !== true ||
        terminal.adminPathUnchanged !== true
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-488 terminal proof is incomplete");
      }
    } catch (error) {
      failures.push(
        Object.freeze({ resource: "task488-terminal-proof", phase: "terminal-proof", error })
      );
    }
  }

  const cleanupOutput = input.cleanup?.output() ?? null;
  const proof =
    cleanupOutput !== null && terminal !== null
      ? Object.freeze({ cleanup: cleanupOutput, terminal })
      : null;
  return Object.freeze({ proof, failures: Object.freeze(failures) });
}

export async function compareTask488RepositoryNeverThrow(input: {
  readonly guard: RepositoryGuard;
  readonly before: RepositorySnapshot;
  readonly allowedPaths: readonly string[];
}): Promise<Readonly<{ after: RepositorySnapshot | null; failure: unknown | null }>> {
  try {
    const after = await input.guard.snapshot(input.allowedPaths);
    input.guard.assertUnchanged(input.before, after, input.allowedPaths);
    return Object.freeze({ after, failure: null });
  } catch (error) {
    return Object.freeze({ after: null, failure: error });
  }
}

export function preserveTask488PrimaryFailure(
  primary: unknown | null,
  cleanupFailures: readonly Task488FinalizationFailure[],
  repositoryFailure: unknown | null
): unknown | null {
  const cleanupErrors = cleanupFailures.map(({ error }) => error);
  if (repositoryFailure !== null) cleanupErrors.push(repositoryFailure);
  if (cleanupErrors.length === 0) return primary;
  const aggregate = new AggregateError(cleanupErrors, "TASK-488 cleanup failed");
  if (primary === null) {
    return new SmokeError("smoke_cleanup_failed", "TASK-488 cleanup failed", {
      cause: aggregate,
    });
  }
  const primaryError =
    primary instanceof SmokeError
      ? primary
      : new SmokeError("smoke_output_invalid", "TASK-488 execution failed", {
          cause: primary,
        });
  return new SmokeError(primaryError.code, primaryError.message, {
    cause: new AggregateError([primaryError, aggregate], "TASK-488 execution and cleanup failed"),
  });
}
