import type { SmokeInput } from "./contracts";
import { SmokeError } from "./contracts";
import type { ProcessSupervisor } from "./process-supervisor";
import type { RepositoryGuard } from "./repository-guard";
import type { TimingRecorder } from "./timing";

export interface RuntimeSmokeContext {
  readonly input: SmokeInput;
  readonly root: string;
  readonly lifecycle: RuntimeLifecycle;
  readonly timing: TimingRecorder;
  readonly processes: ProcessSupervisor;
  readonly repository: RepositoryGuard;
}

export interface LifecycleResource {
  readonly name: string;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

export interface CleanupFailure {
  readonly resource: string;
  readonly phase: "close" | "absence";
  readonly code: "smoke_cleanup_failed";
}

export interface CleanupResult {
  readonly pass: boolean;
  readonly failures: readonly CleanupFailure[];
}

export class RuntimeLifecycle {
  readonly #resources: LifecycleResource[] = [];
  #accepting = true;
  #closePromise: Promise<CleanupResult> | null = null;

  register(resource: LifecycleResource): void {
    if (!this.#accepting) throw new SmokeError("smoke_cleanup_failed", "lifecycle is closing");
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(resource.name)) {
      throw new SmokeError("smoke_output_invalid", "lifecycle resource name is invalid");
    }
    if (this.#resources.some(({ name }) => name === resource.name)) {
      throw new SmokeError("smoke_output_invalid", "lifecycle resource is duplicated");
    }
    this.#resources.push(resource);
  }

  assertAccepting(): void {
    if (!this.#accepting)
      throw new SmokeError("smoke_cleanup_failed", "lifecycle stopped admission");
  }

  stopAdmission(): void {
    this.#accepting = false;
  }

  closeAllNeverThrow(): Promise<CleanupResult> {
    if (this.#closePromise !== null) return this.#closePromise;
    this.#accepting = false;
    this.#closePromise = this.#closeResources();
    return this.#closePromise;
  }

  async #closeResources(): Promise<CleanupResult> {
    const failures: CleanupFailure[] = [];
    for (const resource of [...this.#resources].reverse()) {
      try {
        await resource.close();
      } catch {
        failures.push({ resource: resource.name, phase: "close", code: "smoke_cleanup_failed" });
      }
      try {
        if (!(await resource.proveAbsent())) {
          failures.push({
            resource: resource.name,
            phase: "absence",
            code: "smoke_cleanup_failed",
          });
        }
      } catch {
        failures.push({ resource: resource.name, phase: "absence", code: "smoke_cleanup_failed" });
      }
    }
    return Object.freeze({ pass: failures.length === 0, failures: Object.freeze(failures) });
  }
}

export function installLifecycleSignals(
  lifecycle: RuntimeLifecycle,
  processLike: Pick<NodeJS.Process, "on" | "off"> = process
): () => void {
  const handler = (): void => {
    lifecycle.stopAdmission();
    void lifecycle.closeAllNeverThrow();
  };
  processLike.on("SIGINT", handler);
  processLike.on("SIGTERM", handler);
  return () => {
    processLike.off("SIGINT", handler);
    processLike.off("SIGTERM", handler);
  };
}
