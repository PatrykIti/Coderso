import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { BrowserTransport } from "../../../../browser/transport";
import type {
  BrowserActionFrame,
  BrowserFrameExpectation,
  BrowserRunCodeDispatch,
  MaterializedBrowserSegment,
} from "../../../../browser/contracts";
import { splitMaterializedSegment } from "../../../../browser/segment-compiler";
import { isPlainObject, resolveInsideRoot, SmokeError } from "../../../../contracts";
import type { PlainJsonValue } from "../../../../workers/contracts";
import {
  createTask540BrowserExecutor,
  type Task540PreparedBrowserRequest,
} from "../../browser-executor";
import { compileTask540BrowserDispatchPlan, task540ManifestSha256 } from "../../browser-segments";
import type {
  Task540NativeAction,
  Task540NativeBrowserReceipt,
  Task540NativePlan,
} from "../composition/contracts";
import type { Task540ExecutionMemory } from "../composition/memory";
import { validateTask540ActionOutput } from "../composition/output-validation";
import {
  buildTask540BrowserActionSource,
  materializeTask540Standalone,
  type Task540BrowserNativeCommand,
  type Task540BrowserSecrets,
} from "./action-sources";

const PNG_SIGNATURE = "89504e470d0a1a0a";
const MAXIMUM_SCREENSHOT_BYTES = 16 * 1024 * 1024;

interface BrowserOutput extends Record<string, PlainJsonValue> {
  readonly actionId: string;
  readonly authoredOutput: PlainJsonValue;
  readonly scenarioId: string;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly screenshotPath: string | null;
}

type Task540PreparedNativeAction = Task540NativeAction & Task540PreparedBrowserRequest;

export interface Task540BrowserNativeController {
  dispatchNative(command: Task540BrowserNativeCommand): Promise<Uint8Array>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

export interface Task540StandaloneExecutionInput {
  readonly action: Task540NativeAction;
  readonly plan: Task540NativePlan;
  readonly memory: Task540ExecutionMemory;
  readonly root: string;
  readonly secrets: Task540BrowserSecrets;
  readonly firstBrowserActionInScenario: boolean;
  readonly native: Task540BrowserNativeController;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  executeSource(action: Task540NativeAction, source: string): Promise<Task540NativeBrowserReceipt>;
}

export async function executeTask540StandaloneAction(
  input: Task540StandaloneExecutionInput
): Promise<Task540NativeBrowserReceipt> {
  const standalone = materializeTask540Standalone(input);
  if (standalone.kind === "source") {
    return input.executeSource(input.action, standalone.source);
  }
  let output: PlainJsonValue;
  if (standalone.kind === "native") {
    const stdout = await input.native.dispatchNative(standalone.command);
    output = Object.freeze({ ok: true });
    if (standalone.command.operation === "route-list") {
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
      } catch (error) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 route list is not UTF-8", {
          cause: error,
        });
      }
      if (text !== "No active routes\n") {
        throw new SmokeError("smoke_output_invalid", "TASK-540 route list is not empty");
      }
      output = Object.freeze([]);
    }
  } else if (standalone.kind === "close") {
    await input.native.close();
    output = "closed";
  } else {
    if (!(await input.native.proveAbsent())) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-540 browser session remains present");
    }
    output = true;
  }
  output = validateTask540ActionOutput({
    root: input.root,
    plan: input.plan,
    action: input.action,
    memory: input.memory,
    output,
  });
  input.memory.record(input.action, output);
  return Object.freeze({
    actionId: input.action.id,
    scenarioId: input.action.scenario,
    output,
    consoleErrors: input.consoleErrors,
    pageErrors: input.pageErrors,
  });
}

function browserActions(plan: Task540NativePlan): readonly Task540NativeAction[] {
  return Object.freeze(
    plan.actionManifest.filter(({ executable }) => executable.type !== "runtime-operation")
  );
}

function firstBrowserActionsByScenario(plan: Task540NativePlan): ReadonlySet<string> {
  const seen = new Set<string>();
  const first = new Set<string>();
  for (const action of browserActions(plan)) {
    if (!seen.has(action.scenario)) {
      seen.add(action.scenario);
      first.add(action.id);
    }
  }
  return first;
}

function validateStringArray(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length > 64 ||
    value.some((item) => typeof item !== "string" || item.length > 512)
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 browser error proof is invalid");
  }
  return Object.freeze([...value]) as readonly string[];
}

function validateBrowserOutput(
  value: PlainJsonValue,
  action: Task540NativeAction,
  plan: Task540NativePlan
): BrowserOutput {
  const screenshotId = action.executable.screenshotId;
  const expectedScreenshotPath =
    typeof screenshotId === "string" ? plan.registries.screenshotPaths[screenshotId] : null;
  if (
    !isPlainObject(value) ||
    value.actionId !== action.id ||
    value.scenarioId !== action.scenario ||
    !("authoredOutput" in value) ||
    value.listenerEpochStartedBeforeNavigation !== true ||
    !isPlainObject(value.visibleEffect) ||
    value.visibleEffect.bodyVisible !== true ||
    typeof value.visibleEffect.width !== "number" ||
    !Number.isFinite(value.visibleEffect.width) ||
    value.visibleEffect.width <= 0 ||
    typeof value.visibleEffect.height !== "number" ||
    !Number.isFinite(value.visibleEffect.height) ||
    value.visibleEffect.height <= 0 ||
    typeof value.visibleEffect.colorScheme !== "string" ||
    value.visibleEffect.colorScheme.length > 128 ||
    value.screenshotPath !== expectedScreenshotPath
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 browser action proof drifted");
  }
  const consoleErrors = validateStringArray(value.consoleErrors);
  const pageErrors = validateStringArray(value.pageErrors);
  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 browser emitted an error");
  }
  return Object.freeze({ ...value, consoleErrors, pageErrors }) as unknown as BrowserOutput;
}

async function screenshotProof(root: string, path: string) {
  const absolute = resolveInsideRoot(root, path, "TASK-540 screenshot path");
  const bytes = await readFile(absolute);
  if (
    bytes.byteLength <= PNG_SIGNATURE.length / 2 ||
    bytes.byteLength > MAXIMUM_SCREENSHOT_BYTES ||
    bytes.subarray(0, PNG_SIGNATURE.length / 2).toString("hex") !== PNG_SIGNATURE
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 screenshot is not a bounded PNG");
  }
  return Object.freeze({
    path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

export function task540BrowserSegmentIds(plan: Task540NativePlan): readonly string[] {
  const dispatchPlan = compileTask540BrowserDispatchPlan(plan);
  return Object.freeze(
    dispatchPlan.dispatches.flatMap((dispatch) => {
      if (dispatch.kind !== "run-code") return [`standalone-${dispatch.actionId}`];
      return [
        dispatch.segmentId,
        ...dispatch.actionIds.map(
          (_, index) => `${dispatch.segmentId}-part-${String(index + 1).padStart(2, "0")}`
        ),
      ];
    })
  );
}

export function createTask540NativeBrowser(input: {
  readonly root: string;
  readonly plan: Task540NativePlan;
  readonly transport: BrowserTransport;
  readonly native: Task540BrowserNativeController;
  readonly session: string;
  readonly secrets: Task540BrowserSecrets;
  readonly memory: Task540ExecutionMemory;
}) {
  const actions = new Map(browserActions(input.plan).map((action) => [action.id, action]));
  const first = firstBrowserActionsByScenario(input.plan);
  const dispatchPlan = compileTask540BrowserDispatchPlan(input.plan);
  const manifestSha256 = task540ManifestSha256(input.plan);
  let latestConsoleErrors: readonly string[] = Object.freeze([]);
  let latestPageErrors: readonly string[] = Object.freeze([]);

  const sourceFor = (action: Task540NativeAction): string =>
    buildTask540BrowserActionSource({
      action,
      plan: input.plan,
      memory: input.memory,
      root: input.root,
      secrets: input.secrets,
      firstBrowserActionInScenario: first.has(action.id),
    });

  const project = async (
    action: Task540NativeAction,
    frame: BrowserActionFrame
  ): Promise<Task540NativeBrowserReceipt> => {
    if (frame.status !== "success") {
      throw new SmokeError(
        "smoke_process_failed",
        `TASK-540 browser action failed: ${frame.actionId} (${frame.failureCode})`
      );
    }
    const output = validateBrowserOutput(frame.output, action, input.plan);
    const authoredOutput = validateTask540ActionOutput({
      root: input.root,
      plan: input.plan,
      action,
      memory: input.memory,
      output: output.authoredOutput,
    });
    input.memory.record(action, authoredOutput);
    latestConsoleErrors = output.consoleErrors;
    latestPageErrors = output.pageErrors;
    const screenshot =
      output.screenshotPath === null
        ? undefined
        : await screenshotProof(input.root, output.screenshotPath);
    return Object.freeze({
      actionId: action.id,
      scenarioId: action.scenario,
      output,
      consoleErrors: output.consoleErrors,
      pageErrors: output.pageErrors,
      ...(screenshot === undefined ? {} : { screenshot }),
    });
  };

  const executor = createTask540BrowserExecutor<
    Task540PreparedNativeAction,
    Task540NativeBrowserReceipt
  >({
    dispatchPlan,
    runId: `${input.session}-task540`,
    manifestSha256,
    async materializeSegment(segment: BrowserRunCodeDispatch) {
      return Object.freeze({
        segment,
        actions: Object.freeze(
          segment.actionIds.map((actionId) => {
            const action = actions.get(actionId);
            if (action === undefined) {
              throw new SmokeError("smoke_output_invalid", "TASK-540 browser action is absent");
            }
            return Object.freeze({ actionId, source: sourceFor(action) });
          })
        ),
      });
    },
    splitMaterializedSegment(materialized: MaterializedBrowserSegment) {
      const sizes = new Map(
        materialized.actions.map(({ actionId, source }) => [actionId, Buffer.byteLength(source)])
      );
      const segments = splitMaterializedSegment(materialized.segment, sizes);
      let offset = 0;
      return segments.map((segment) => {
        const actions = materialized.actions.slice(offset, offset + segment.actionIds.length);
        offset += segment.actionIds.length;
        return Object.freeze({ segment, actions: Object.freeze(actions) });
      });
    },
    async dispatchSegment(materialized, expectation: BrowserFrameExpectation) {
      return Object.freeze({
        frames: await input.transport.runSegment(materialized, expectation),
        proof: Object.freeze({ segmentId: expectation.segmentId }),
      });
    },
    async projectFrame(action, frame) {
      return project(action, frame);
    },
    async executeStandalone(action) {
      return executeTask540StandaloneAction({
        action,
        plan: input.plan,
        memory: input.memory,
        root: input.root,
        secrets: input.secrets,
        firstBrowserActionInScenario: first.has(action.id),
        native: input.native,
        consoleErrors: latestConsoleErrors,
        pageErrors: latestPageErrors,
        async executeSource(sourceAction, source) {
          const segmentId = `standalone-${sourceAction.id}`;
          const expectation: BrowserFrameExpectation = Object.freeze({
            runId: `${input.session}-task540`,
            manifestSha256,
            scenarioId: sourceAction.scenario,
            segmentId,
            actionIds: Object.freeze([sourceAction.id]),
          });
          const frames = await input.transport.runSegment(
            {
              segment: {
                schemaVersion: 1,
                kind: "run-code",
                segmentId,
                scenarioId: sourceAction.scenario,
                actionIds: Object.freeze([sourceAction.id]),
                estimatedSourceBytes: Buffer.byteLength(source),
              },
              actions: Object.freeze([{ actionId: sourceAction.id, source }]),
            },
            expectation
          );
          const frame = frames[0];
          if (frames.length !== 1 || frame === undefined) {
            throw new SmokeError("smoke_output_invalid", "TASK-540 standalone frame is absent");
          }
          return project(sourceAction, frame);
        },
      });
    },
  });

  return Object.freeze({
    execute(action: Task540NativeAction): Promise<Task540NativeBrowserReceipt> {
      if (action.executable.type === "runtime-operation") {
        throw new SmokeError("smoke_output_invalid", "TASK-540 runtime action reached browser");
      }
      return executor.executePrepared({
        ...action,
        executableType: action.executable.type,
        actionId: action.id,
      });
    },
    assertDrained(): void {
      executor.assertDrained();
    },
  });
}
