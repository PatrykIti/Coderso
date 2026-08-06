import { createHash } from "node:crypto";
import { SmokeError } from "../../contracts";
import type {
  BrowserDispatchPlan,
  BrowserPlanAction,
  BrowserSegmentLimits,
} from "../../browser/contracts";
import {
  DEFAULT_BROWSER_SEGMENT_LIMITS,
  compileBrowserDispatchPlan,
} from "../../browser/segment-compiler";

interface Task540Executable {
  readonly type:
    | "runtime-operation"
    | "browser-run-code"
    | "browser-native"
    | "browser-screenshot"
    | "browser-global-list";
}

interface Task540ManifestAction {
  readonly id: string;
  readonly scenario: string;
  readonly executable: Task540Executable;
}

export interface Task540SegmentPlanSource {
  readonly actionManifest: readonly Task540ManifestAction[];
  readonly runtimeCaptureBindings: Readonly<Record<string, readonly string[]>>;
}

export const TASK_540_EXPECTED_BROWSER_TOTALS = Object.freeze({
  actions: 496,
  browser: 420,
  runtime: 76,
  runCode: 392,
  runCodeBatchesBeforeSizeSplits: 47,
  standalone: 28,
  dispatchesBeforeSizeSplits: 75,
});

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function task540ManifestSha256(plan: Task540SegmentPlanSource): string {
  if (!Array.isArray(plan.actionManifest) || plan.actionManifest.length !== 496) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 manifest digest input drifted");
  }
  return createHash("sha256").update(canonical(plan.actionManifest)).digest("hex");
}

export function projectTask540BrowserActions(
  plan: Task540SegmentPlanSource
): readonly BrowserPlanAction[] {
  if (
    !Array.isArray(plan.actionManifest) ||
    plan.actionManifest.length !== TASK_540_EXPECTED_BROWSER_TOTALS.actions
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 manifest cardinality drifted");
  }
  return Object.freeze(
    plan.actionManifest.map((action) => {
      const lane =
        action.executable.type === "runtime-operation"
          ? "runtime"
          : action.executable.type === "browser-run-code"
            ? "run-code"
            : "standalone";
      const captureOutputs = plan.runtimeCaptureBindings[action.id] ?? [];
      return Object.freeze({
        id: action.id,
        scenarioId: action.scenario,
        lane,
        captureOutputs: Object.freeze([...captureOutputs]),
        isolated: action.id === "set-011-login-submit",
      });
    })
  );
}

export function compileTask540BrowserDispatchPlan(
  plan: Task540SegmentPlanSource,
  limits: BrowserSegmentLimits = DEFAULT_BROWSER_SEGMENT_LIMITS
): BrowserDispatchPlan {
  const projected = projectTask540BrowserActions(plan);
  const compiled = compileBrowserDispatchPlan(projected, limits);
  const runtime = projected.filter(({ lane }) => lane === "runtime").length;
  if (
    runtime !== TASK_540_EXPECTED_BROWSER_TOTALS.runtime ||
    compiled.logicalBrowserActions !== TASK_540_EXPECTED_BROWSER_TOTALS.browser ||
    compiled.runCodeActions !== TASK_540_EXPECTED_BROWSER_TOTALS.runCode ||
    compiled.standaloneActions !== TASK_540_EXPECTED_BROWSER_TOTALS.standalone ||
    (limits.maximumActions === DEFAULT_BROWSER_SEGMENT_LIMITS.maximumActions &&
      limits.maximumSourceBytes === DEFAULT_BROWSER_SEGMENT_LIMITS.maximumSourceBytes &&
      (compiled.runCodeBatches !==
        TASK_540_EXPECTED_BROWSER_TOTALS.runCodeBatchesBeforeSizeSplits ||
        compiled.physicalDispatches !==
          TASK_540_EXPECTED_BROWSER_TOTALS.dispatchesBeforeSizeSplits))
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 browser dispatch partition drifted");
  }
  return compiled;
}
