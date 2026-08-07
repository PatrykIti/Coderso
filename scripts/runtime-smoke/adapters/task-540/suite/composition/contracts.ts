import { SmokeError } from "../../../../contracts";
import type { PlainJsonValue } from "../../../../workers/contracts";
import type { SmokeScreenshotResult } from "../../../types";

export type Task540NativeExecutableType =
  | "runtime-operation"
  | "browser-run-code"
  | "browser-native"
  | "browser-screenshot"
  | "browser-global-list";

export interface Task540NativeExecutable {
  readonly type: Task540NativeExecutableType;
  readonly operationId?: string;
  readonly sourceId?: string;
  readonly refs?: readonly unknown[];
  readonly screenshotId?: string;
  readonly fullPage?: boolean;
}

export interface Task540NativeAction {
  readonly ordinal: number;
  readonly id: string;
  readonly scenario: string;
  readonly pageId: string | null;
  readonly tabIndex: number | null;
  readonly kind: string;
  readonly builder: string;
  readonly executable: Task540NativeExecutable;
  readonly outputSchemaId: string;
}

export interface Task540NativePlan {
  readonly schemaVersion: 1;
  readonly nonce: string;
  readonly prefix: string;
  readonly actionManifest: readonly Task540NativeAction[];
  readonly requiredScenarios: readonly string[];
  readonly requiredScreenshotPaths: readonly string[];
  readonly requiredAuthRatePlan: Readonly<Record<string, unknown>>;
  readonly requiredIsolatedApiReadExpectations: Readonly<Record<string, boolean>>;
  readonly fixtureCaptureBindings: Readonly<Record<string, readonly string[]>>;
  readonly runtimeCaptureBindings: Readonly<Record<string, readonly string[]>>;
  readonly fixtureBlueprint: Readonly<Record<string, unknown>>;
  readonly registries: {
    readonly selectors: Readonly<Record<string, unknown>>;
    readonly paths: Readonly<Record<string, unknown>>;
    readonly browserRunCodeSources: Readonly<
      Record<string, { readonly actionId: string; readonly refCount: number }>
    >;
    readonly screenshotPaths: Readonly<Record<string, string>>;
    readonly outputs: Readonly<
      Record<
        string,
        Readonly<{
          readonly grammar: Readonly<Record<string, unknown>>;
          readonly schema: Readonly<Record<string, unknown>>;
          readonly predicate: Readonly<Record<string, unknown>> | null;
          readonly rememberAs: string | null;
        }>
      >
    >;
    readonly privateProjectionBindings: {
      readonly authorityId: string;
      readonly outputSchemaId: string;
      readonly materializerId: string;
      readonly producerActionIds: readonly string[];
      readonly consumerActionIds: readonly string[];
    };
  };
}

export interface Task540NativeRuntimeReceipt {
  readonly actionId: string;
  readonly scenarioId: string;
  readonly output: PlainJsonValue;
}

export interface Task540NativeBrowserReceipt {
  readonly actionId: string;
  readonly scenarioId: string;
  readonly output: PlainJsonValue;
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly screenshot?: SmokeScreenshotResult;
}

export interface Task540NativeCleanupReceipt {
  readonly logicalId: string;
  readonly pass: true;
}

export interface Task540NativeScenarioEvidence {
  readonly id: string;
  readonly pass: true;
  readonly elapsedMs: number;
}

export interface Task540NativeEvidence {
  readonly pass: true;
  readonly serverUp: true;
  readonly browserReceipts: readonly Task540NativeBrowserReceipt[];
  readonly runtimeReceipts: readonly Task540NativeRuntimeReceipt[];
  readonly cleanupReceipts: readonly Task540NativeCleanupReceipt[];
  readonly scenarios: readonly Task540NativeScenarioEvidence[];
  readonly screenshots: readonly SmokeScreenshotResult[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

const EXPECTED_TYPES: Readonly<Record<Task540NativeExecutableType, number>> = Object.freeze({
  "runtime-operation": 76,
  "browser-run-code": 392,
  "browser-native": 14,
  "browser-screenshot": 13,
  "browser-global-list": 1,
});

export function validateTask540NativePlan(plan: Task540NativePlan): Task540NativePlan {
  const isolatedExpectations = plan.requiredIsolatedApiReadExpectations;
  if (
    plan.schemaVersion !== 1 ||
    !Array.isArray(plan.actionManifest) ||
    plan.actionManifest.length !== 496 ||
    !Array.isArray(plan.requiredScenarios) ||
    plan.requiredScenarios.length !== 7 ||
    new Set(plan.requiredScenarios).size !== 7 ||
    !Array.isArray(plan.requiredScreenshotPaths) ||
    plan.requiredScreenshotPaths.length !== 13 ||
    new Set(plan.requiredScreenshotPaths).size !== 13 ||
    isolatedExpectations === null ||
    typeof isolatedExpectations !== "object" ||
    JSON.stringify(Object.keys(isolatedExpectations).sort()) !==
      JSON.stringify([
        "ru-047a-a-durable-proof",
        "ru-051-a-server-false-proof",
        "ru-061a-a-durable-bypass-read",
      ]) ||
    isolatedExpectations["ru-047a-a-durable-proof"] !== true ||
    isolatedExpectations["ru-051-a-server-false-proof"] !== false ||
    isolatedExpectations["ru-061a-a-durable-bypass-read"] !== false
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 native plan cardinality drifted");
  }
  const ids = new Set<string>();
  for (const [index, action] of plan.actionManifest.entries()) {
    if (
      action.ordinal !== index + 1 ||
      typeof action.id !== "string" ||
      action.id.length === 0 ||
      ids.has(action.id) ||
      typeof action.scenario !== "string" ||
      !(action.executable.type in EXPECTED_TYPES)
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 native action identity drifted");
    }
    ids.add(action.id);
  }
  for (const [type, expected] of Object.entries(EXPECTED_TYPES)) {
    if (
      plan.actionManifest.filter((action) => action.executable.type === type).length !== expected
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 native action partition drifted");
    }
  }
  const browser = plan.actionManifest.filter(
    ({ executable }) => executable.type !== "runtime-operation"
  ).length;
  if (browser !== 420) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 native browser total drifted");
  }
  return plan;
}

export function validateTask540NativeEvidence(
  evidence: Task540NativeEvidence,
  plan: Task540NativePlan
): Task540NativeEvidence {
  const scenarioIds = evidence.scenarios.map(({ id }) => id);
  const screenshotPaths = evidence.screenshots.map(({ path }) => path);
  if (
    evidence.pass !== true ||
    evidence.serverUp !== true ||
    evidence.browserReceipts.length !== 420 ||
    evidence.runtimeReceipts.length !== 76 ||
    evidence.cleanupReceipts.length !== 72 ||
    scenarioIds.some((id, index) => id !== plan.requiredScenarios[index]) ||
    evidence.scenarios.some(
      ({ pass, elapsedMs }) => pass !== true || !Number.isSafeInteger(elapsedMs) || elapsedMs <= 0
    ) ||
    screenshotPaths.some((path, index) => path !== plan.requiredScreenshotPaths[index]) ||
    evidence.screenshots.length !== 13 ||
    evidence.consoleErrors.length !== 0 ||
    evidence.pageErrors.length !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 native evidence drifted");
  }
  return evidence;
}
