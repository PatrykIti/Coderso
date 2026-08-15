import { SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeLifecycle } from "../../lifecycle";
import type { RepositoryGuard, RepositorySnapshot } from "../../repository-guard";
import type { PlainJsonObject, WorkerOperationDescriptor } from "../../workers/contracts";
import type { WorkerPool } from "../../workers/pool";
import type { Task491CleanupOutput, Task491ProofOutput } from "./worker-operations";

export interface Task491WorkerCleanupDescriptors {
  readonly cleanup: WorkerOperationDescriptor;
  readonly prove: WorkerOperationDescriptor;
}

export interface Task491CleanupResources {
  readonly integrations: Task491IntegrationCleanupResource;
}

export interface Task491FinalCleanupProof {
  readonly cleanup: Task491CleanupOutput;
  readonly terminal: Task491ProofOutput;
}

export interface Task491FinalizationFailure {
  readonly resource: string;
  readonly phase: "close" | "absence" | "terminal-proof";
  readonly error: unknown;
}

export interface Task491FinalizationResult {
  readonly proof: Task491FinalCleanupProof | null;
  readonly failures: readonly Task491FinalizationFailure[];
}

abstract class Task491WorkerResource<TOutput extends PlainJsonObject> implements LifecycleResource {
  abstract readonly name: string;
  readonly #workers: WorkerPool;
  readonly #descriptor: WorkerOperationDescriptor;
  #output: TOutput | null = null;
  #closePromise: Promise<void> | null = null;

  constructor(workers: WorkerPool, descriptor: WorkerOperationDescriptor) {
    this.#workers = workers;
    this.#descriptor = descriptor;
  }

  output(): TOutput | null {
    return this.#output;
  }

  close(): Promise<void> {
    this.#closePromise ??= this.#closeOnce();
    return this.#closePromise;
  }

  async #closeOnce(): Promise<void> {
    const output = await this.#workers.dispatch(this.#descriptor, Object.freeze({}));
    this.#output = output as TOutput;
    this.assertOutput(this.#output);
    const statements = Reflect.get(this.#output, "statements");
    const rows = Reflect.get(this.#output, "rows");
    if (typeof statements !== "number" || typeof rows !== "number") {
      throw new SmokeError("smoke_output_invalid", `${this.name} counters are absent`);
    }
    this.#workers.recordDatabaseBatch(statements, rows);
  }

  async proveAbsent(): Promise<boolean> {
    return this.#output !== null && this.accepted(this.#output);
  }

  protected abstract assertOutput(output: TOutput): void;
  protected abstract accepted(output: TOutput): boolean;
}

export class Task491IntegrationCleanupResource extends Task491WorkerResource<Task491CleanupOutput> {
  readonly name = "task491-integration-cleanup";

  protected assertOutput(output: Task491CleanupOutput): void {
    if (output.schemaVersion !== 1 || output.remainingRows !== 0) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-491 integration cleanup is incomplete");
    }
  }

  protected accepted(output: Task491CleanupOutput): boolean {
    return output.schemaVersion === 1 && output.remainingRows === 0;
  }
}

export function createTask491CleanupResources(input: {
  readonly lifecycle: RuntimeLifecycle;
  readonly workers: WorkerPool;
  readonly descriptors: Task491WorkerCleanupDescriptors;
}): Task491CleanupResources {
  const integrations = new Task491IntegrationCleanupResource(
    input.workers,
    input.descriptors.cleanup
  );
  input.lifecycle.register(integrations);
  return Object.freeze({ integrations });
}

async function closeAndProve(
  resource: LifecycleResource | null,
  failures: Task491FinalizationFailure[]
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

export async function finalizeTask491ResourcesNeverThrow(input: {
  readonly browser: LifecycleResource | null;
  readonly workspace: LifecycleResource | null;
  readonly server: LifecycleResource | null;
  readonly cleanup: Task491CleanupResources | null;
  readonly workers: WorkerPool;
  readonly proofDescriptor: WorkerOperationDescriptor;
}): Promise<Task491FinalizationResult> {
  const failures: Task491FinalizationFailure[] = [];
  await closeAndProve(input.browser, failures);
  await closeAndProve(input.workspace, failures);
  await closeAndProve(input.server, failures);
  await closeAndProve(input.cleanup?.integrations ?? null, failures);

  let terminal: Task491ProofOutput | null = null;
  if (input.cleanup !== null) {
    try {
      terminal = (await input.workers.dispatch(
        input.proofDescriptor,
        Object.freeze({})
      )) as Task491ProofOutput;
      input.workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.schemaVersion !== 1 ||
        terminal.cleanupDone !== true ||
        terminal.remainingRows !== 0
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-491 terminal proof is incomplete");
      }
    } catch (error) {
      failures.push(
        Object.freeze({ resource: "task491-terminal-proof", phase: "terminal-proof", error })
      );
    }
  }

  const cleanup = input.cleanup?.integrations.output() ?? null;
  const proof = cleanup !== null && terminal !== null ? Object.freeze({ cleanup, terminal }) : null;
  return Object.freeze({ proof, failures: Object.freeze(failures) });
}

export async function compareTask491RepositoryNeverThrow(input: {
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

export function preserveTask491PrimaryFailure(
  primary: unknown | null,
  cleanupFailures: readonly Task491FinalizationFailure[],
  repositoryFailure: unknown | null
): unknown | null {
  const cleanupErrors = cleanupFailures.map(({ error }) => error);
  if (repositoryFailure !== null) cleanupErrors.push(repositoryFailure);
  if (cleanupErrors.length === 0) return primary;
  const aggregate = new AggregateError(cleanupErrors, "TASK-491 cleanup failed");
  if (primary === null) {
    return new SmokeError("smoke_cleanup_failed", "TASK-491 cleanup failed", {
      cause: aggregate,
    });
  }
  const primaryError =
    primary instanceof SmokeError
      ? primary
      : new SmokeError("smoke_output_invalid", "TASK-491 execution failed", {
          cause: primary,
        });
  return new SmokeError(primaryError.code, primaryError.message, {
    cause: new AggregateError([primaryError, aggregate], "TASK-491 execution and cleanup failed"),
  });
}
