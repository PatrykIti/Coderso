import { SmokeError } from "../../../../contracts";
import type { RuntimeLifecycle } from "../../../../lifecycle";
import type { PlainJsonValue } from "../../../../workers/contracts";
import type { WorkerPool } from "../../../../workers/pool";
import type {
  Task540NativeAction,
  Task540NativeCleanupReceipt,
  Task540NativePlan,
} from "../composition/contracts";
import { Task540AdminApiSessions } from "./admin-session";
import { finalizeTask540NativeCleanup } from "./cleanup";
import type {
  Task540RuntimeBrowserConfig,
  Task540RuntimeMemoryView,
  Task540RuntimeState,
} from "./contracts";
import { runtimeInvariant } from "./native-utils";
import { executeTask540OverrideAction } from "./override-actions";
import { executeTask540PlatformAction } from "./platform-actions";

export const TASK540_NATIVE_RUNTIME_ACTION_IDS = Object.freeze([
  "set-001-storage-preflight",
  "set-002-helper-launch",
  "set-003-admin-health",
  "set-004-front-health",
  "set-004a-bot-protection-preflight",
  "set-004b-session-policy-preflight",
  "set-004c-auth-rate-budget-preflight",
  "set-011b-bootstrap-api-login",
  "set-011c-bootstrap-csrf-capture",
  "set-012-user-a-create",
  "set-013-user-a-proof",
  "set-014-user-b-create",
  "set-015-user-b-proof",
  "set-016-editable-type-create",
  "set-017-editable-type-proof",
  "set-018-related-a-type-create",
  "set-019-related-a-type-proof",
  "set-020-related-b-type-create",
  "set-021-related-b-type-proof",
  "set-021a-related-failure-type-create",
  "set-021b-related-failure-type-proof",
  "set-022-related-a1-create",
  "set-023-related-a1-proof",
  "set-024-related-a2-create",
  "set-025-related-a2-proof",
  "set-026-related-b1-create",
  "set-027-related-b1-proof",
  "set-028-related-b2-create",
  "set-029-related-b2-proof",
  "set-029a-related-failure1-create",
  "set-029b-related-failure1-proof",
  "set-030-media-upload",
  "set-031-media-proof",
  "set-032-storage-post-setup",
  "set-033-entry-create",
  "set-034-entry-proof",
  "set-035-screen-create",
  "set-036-screen-proof",
  "set-037-retry-screen-create",
  "set-038-retry-screen-proof",
  "set-039-override-create",
  "set-040-override-proof",
  "set-041-preference-a",
  "set-042-preference-a-proof",
  "set-043-preference-b",
  "set-044-preference-b-proof",
  "bi-060-unsafe-patch",
  "bi-061-unsafe-proof-read",
  "bi-064-baseline-restore",
  "bi-065-baseline-proof",
  "tc-001-reset",
  "tc-002-reset-proof",
  "ss-001-screen-reset",
  "ss-002-screen-proof",
  "ss-003-entry-reset",
  "ss-004-entry-proof",
  "ss-005-overrides-reset",
  "ss-006-overrides-proof",
  "dg-001-entry-reset",
  "dg-002-entry-proof",
  "rc-001-entry-reset",
  "rc-002-entry-proof",
  "rc-003-overrides-reset",
  "rc-004-overrides-proof",
  "ru-001-screen-reset",
  "ru-002-screen-proof",
  "ru-003-entry-reset",
  "ru-004-entry-proof",
  "ru-005-overrides-reset",
  "ru-006-overrides-proof",
  "ru-043b-a-api-login",
  "ru-043c-a-api-csrf-capture",
  "ru-047a-a-durable-proof",
  "ru-050-a-server-false",
  "ru-051-a-server-false-proof",
  "ru-061a-a-durable-bypass-read",
] as const);

const RUNTIME_IDS = new Set<string>(TASK540_NATIVE_RUNTIME_ACTION_IDS);

export class Task540NativeRuntime {
  readonly #state: Task540RuntimeState;
  readonly #runtimeActions: readonly Task540NativeAction[];
  readonly #executed = new Set<string>();
  #cursor = 0;
  #cleanupPromise: Promise<readonly Task540NativeCleanupReceipt[]> | null = null;

  constructor(input: {
    readonly root: string;
    readonly plan: Task540NativePlan;
    readonly pool: WorkerPool;
    readonly lifecycle: RuntimeLifecycle;
    readonly memory: Task540RuntimeMemoryView;
    readonly environment?: NodeJS.ProcessEnv;
    readonly fetch?: typeof globalThis.fetch;
    readonly hostReady: boolean;
  }) {
    this.#runtimeActions = Object.freeze(
      input.plan.actionManifest.filter(({ executable }) => executable.type === "runtime-operation")
    );
    runtimeInvariant(
      TASK540_NATIVE_RUNTIME_ACTION_IDS.length === 76 &&
        this.#runtimeActions.length === 76 &&
        this.#runtimeActions.every(
          (action, index) =>
            action.id === TASK540_NATIVE_RUNTIME_ACTION_IDS[index] &&
            action.executable.operationId === `runtime/${action.id}`
        ) &&
        RUNTIME_IDS.size === 76,
      "TASK-540 runtime action map drifted"
    );
    const sessions = new Task540AdminApiSessions(input.fetch);
    input.lifecycle.register(sessions);
    this.#state = {
      root: input.root,
      plan: input.plan,
      pool: input.pool,
      sessions,
      environment: input.environment ?? process.env,
      memory: input.memory,
      baselineCaptured: false,
      hostReady: input.hostReady,
      csrfHeaderName: null,
      authRatePolicy: null,
      bootstrapUserId: null,
      bootstrapBaseline: null,
      bootstrapNewestOwnedPair: null,
      bootstrapLoginAttempted: false,
      bootstrapRestored: false,
      editableContentType: null,
      editableEntryBody: null,
      mediaRecord: null,
      expectedOverrides: Object.freeze([]),
      contentTypeBodies: new Map(),
      entryBodies: new Map(),
      screenBodies: new Map(),
    };
  }

  async execute(
    action: Task540NativeAction,
    memory: Task540RuntimeMemoryView
  ): Promise<PlainJsonValue> {
    const expected = this.#runtimeActions[this.#cursor];
    if (
      expected === undefined ||
      action !== expected ||
      !RUNTIME_IDS.has(action.id) ||
      this.#executed.has(action.id) ||
      action.executable.type !== "runtime-operation" ||
      action.executable.operationId !== `runtime/${action.id}`
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 runtime action order drifted");
    }
    this.#state.memory = memory;
    const platform = await executeTask540PlatformAction(this.#state, action);
    const output = platform ?? (await executeTask540OverrideAction(this.#state, action));
    runtimeInvariant(output !== undefined, "TASK-540 runtime action is not routed");
    this.#executed.add(action.id);
    this.#cursor += 1;
    return output;
  }

  browserRuntimeConfig(): Task540RuntimeBrowserConfig {
    runtimeInvariant(
      this.#state.csrfHeaderName !== null && this.#state.authRatePolicy !== null,
      "TASK-540 browser runtime config is absent"
    );
    return Object.freeze({
      csrfHeaderName: this.#state.csrfHeaderName,
      authRatePolicy: this.#state.authRatePolicy,
    });
  }

  finalizeCleanup(
    memory: Task540RuntimeMemoryView
  ): Promise<readonly Task540NativeCleanupReceipt[]> {
    runtimeInvariant(
      this.#cursor === 76 && this.#executed.size === 76,
      "TASK-540 runtime action set is incomplete"
    );
    this.#state.memory = memory;
    this.#cleanupPromise ??= finalizeTask540NativeCleanup(this.#state);
    return this.#cleanupPromise;
  }
}
