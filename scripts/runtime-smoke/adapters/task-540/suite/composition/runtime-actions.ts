import type {
  Task540NativeAction,
  Task540NativeCleanupReceipt,
  Task540NativePlan,
  Task540NativeRuntimeReceipt,
} from "./contracts";
import { Task540ExecutionMemory } from "./memory";
import { validateTask540ActionOutput } from "./output-validation";
import type { Task540NativeRuntime } from "../runtime/native-runtime";

export class Task540NativeRuntimeActions {
  readonly #root: string;
  readonly #plan: Task540NativePlan;
  readonly #runtime: Task540NativeRuntime;
  readonly #memory: Task540ExecutionMemory;

  constructor(input: {
    readonly root: string;
    readonly plan: Task540NativePlan;
    readonly runtime: Task540NativeRuntime;
    readonly memory: Task540ExecutionMemory;
  }) {
    this.#root = input.root;
    this.#plan = input.plan;
    this.#runtime = input.runtime;
    this.#memory = input.memory;
  }

  async execute(action: Task540NativeAction): Promise<Task540NativeRuntimeReceipt> {
    let output = await this.#runtime.execute(action, this.#memory);
    output = validateTask540ActionOutput({
      root: this.#root,
      plan: this.#plan,
      action,
      memory: this.#memory,
      output,
    });
    if (action.id === "set-004c-auth-rate-budget-preflight") {
      this.#memory.setRuntimeConfig(this.#runtime.browserRuntimeConfig());
    }
    this.#memory.record(action, output);
    return Object.freeze({ actionId: action.id, scenarioId: action.scenario, output });
  }

  finalizeCleanup(): Promise<readonly Task540NativeCleanupReceipt[]> {
    return this.#runtime.finalizeCleanup(this.#memory);
  }
}
