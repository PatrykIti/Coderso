import { SmokeError } from "../../contracts";
import type { LifecycleResource, RuntimeLifecycle } from "../../lifecycle";
import type { RepositoryGuard, RepositorySnapshot } from "../../repository-guard";
import type { PlainJsonObject, WorkerOperationDescriptor } from "../../workers/contracts";
import type { WorkerPool } from "../../workers/pool";
import type {
  Task547CleanupOutput,
  Task547ProofOutput,
  Task547ResetOutput,
  Task547RollbackOutput,
} from "./worker-operations";

export interface Task547WorkerCleanupDescriptors {
  readonly cleanup: WorkerOperationDescriptor;
  readonly reset: WorkerOperationDescriptor;
  readonly rollback: WorkerOperationDescriptor;
  readonly prove: WorkerOperationDescriptor;
}

export interface Task547CleanupResources {
  readonly submissions: Task547SubmissionCleanupResource;
  readonly reset: Task547ScenarioResetResource;
  readonly rollback: Task547RollbackResource;
}

export interface Task547FinalCleanupProof {
  readonly submissions: Task547CleanupOutput;
  readonly reset: Task547ResetOutput;
  readonly rollback: Task547RollbackOutput;
  readonly terminal: Task547ProofOutput;
}

export interface Task547FinalizationFailure {
  readonly resource: string;
  readonly phase: "close" | "absence" | "terminal-proof";
  readonly error: unknown;
}

export interface Task547FinalizationResult {
  readonly proof: Task547FinalCleanupProof | null;
  readonly failures: readonly Task547FinalizationFailure[];
}

abstract class Task547WorkerResource<TOutput extends PlainJsonObject> implements LifecycleResource {
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

export class Task547SubmissionCleanupResource extends Task547WorkerResource<Task547CleanupOutput> {
  readonly name = "task547-submission-cleanup";

  protected assertOutput(output: Task547CleanupOutput): void {
    if (
      output.schemaVersion !== 1 ||
      output.remainingSubmissionRows.length !== 0 ||
      output.remainingTempArtifacts.length !== 0
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-547 submission cleanup is incomplete");
    }
  }

  protected accepted(output: Task547CleanupOutput): boolean {
    return (
      output.remainingSubmissionRows.length === 0 && output.remainingTempArtifacts.length === 0
    );
  }
}

export class Task547ScenarioResetResource extends Task547WorkerResource<Task547ResetOutput> {
  readonly name = "task547-scenario-reset";

  protected assertOutput(output: Task547ResetOutput): void {
    if (output.schemaVersion !== 1 || !/^[a-f0-9]{64}$/u.test(output.stateDigest)) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-547 scenario reset is incomplete");
    }
  }

  protected accepted(output: Task547ResetOutput): boolean {
    return /^[a-f0-9]{64}$/u.test(output.stateDigest);
  }
}

export class Task547RollbackResource extends Task547WorkerResource<Task547RollbackOutput> {
  readonly name = "task547-official-rollback";

  protected assertOutput(output: Task547RollbackOutput): void {
    if (
      output.schemaVersion !== 1 ||
      output.officialRollbackCalls !== 1 ||
      output.priorSettingsRestored !== true ||
      output.resourceAbsenceProved !== true
    ) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-547 official rollback is incomplete");
    }
  }

  protected accepted(output: Task547RollbackOutput): boolean {
    return (
      output.officialRollbackCalls === 1 &&
      output.priorSettingsRestored &&
      output.resourceAbsenceProved
    );
  }
}

export function createTask547CleanupResources(input: {
  readonly lifecycle: RuntimeLifecycle;
  readonly workers: WorkerPool;
  readonly descriptors: Task547WorkerCleanupDescriptors;
}): Task547CleanupResources {
  const rollback = new Task547RollbackResource(input.workers, input.descriptors.rollback);
  const reset = new Task547ScenarioResetResource(input.workers, input.descriptors.reset);
  const submissions = new Task547SubmissionCleanupResource(
    input.workers,
    input.descriptors.cleanup
  );
  // Reverse lifecycle close order is submissions -> reset -> official rollback.
  input.lifecycle.register(rollback);
  input.lifecycle.register(reset);
  input.lifecycle.register(submissions);
  return Object.freeze({ submissions, reset, rollback });
}

async function closeAndProve(
  resource: LifecycleResource | null,
  failures: Task547FinalizationFailure[]
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

export async function finalizeTask547ResourcesNeverThrow(input: {
  readonly browser: LifecycleResource | null;
  readonly workspace: LifecycleResource | null;
  readonly server: LifecycleResource | null;
  readonly cleanup: Task547CleanupResources | null;
  readonly workers: WorkerPool;
  readonly proofDescriptor: WorkerOperationDescriptor;
}): Promise<Task547FinalizationResult> {
  const failures: Task547FinalizationFailure[] = [];
  await closeAndProve(input.browser, failures);
  await closeAndProve(input.workspace, failures);
  await closeAndProve(input.server, failures);
  await closeAndProve(input.cleanup?.submissions ?? null, failures);
  await closeAndProve(input.cleanup?.reset ?? null, failures);
  await closeAndProve(input.cleanup?.rollback ?? null, failures);

  let terminal: Task547ProofOutput | null = null;
  if (input.cleanup !== null) {
    try {
      terminal = (await input.workers.dispatch(
        input.proofDescriptor,
        Object.freeze({})
      )) as Task547ProofOutput;
      input.workers.recordDatabaseBatch(terminal.statements, terminal.rows);
      if (
        terminal.cleanupDone !== true ||
        terminal.resetDone !== true ||
        terminal.rollbackDone !== true ||
        terminal.officialRollbackCalls !== 1 ||
        terminal.priorSettingsRestored !== true ||
        terminal.remainingSubmissionRows.length !== 0 ||
        terminal.remainingTempArtifacts.length !== 0
      ) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-547 terminal proof is incomplete");
      }
    } catch (error) {
      failures.push(
        Object.freeze({ resource: "task547-terminal-proof", phase: "terminal-proof", error })
      );
    }
  }

  const submissions = input.cleanup?.submissions.output() ?? null;
  const reset = input.cleanup?.reset.output() ?? null;
  const rollback = input.cleanup?.rollback.output() ?? null;
  const proof =
    submissions !== null && reset !== null && rollback !== null && terminal !== null
      ? Object.freeze({ submissions, reset, rollback, terminal })
      : null;
  return Object.freeze({ proof, failures: Object.freeze(failures) });
}

export async function compareTask547RepositoryNeverThrow(input: {
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

export function preserveTask547PrimaryFailure(
  primary: unknown | null,
  cleanupFailures: readonly Task547FinalizationFailure[],
  repositoryFailure: unknown | null
): unknown | null {
  const cleanupErrors = cleanupFailures.map(({ error }) => error);
  if (repositoryFailure !== null) cleanupErrors.push(repositoryFailure);
  if (cleanupErrors.length === 0) return primary;
  const aggregate = new AggregateError(cleanupErrors, "TASK-547 cleanup failed");
  if (primary === null) {
    return new SmokeError("smoke_cleanup_failed", "TASK-547 cleanup failed", {
      cause: aggregate,
    });
  }
  const primaryError =
    primary instanceof SmokeError
      ? primary
      : new SmokeError("smoke_output_invalid", "TASK-547 execution failed", {
          cause: primary,
        });
  return new SmokeError(primaryError.code, primaryError.message, {
    cause: new AggregateError([primaryError, aggregate], "TASK-547 execution and cleanup failed"),
  });
}
