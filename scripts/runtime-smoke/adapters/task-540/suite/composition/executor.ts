import { SmokeError } from "../../../../contracts";
import {
  validateTask540NativeEvidence,
  validateTask540NativePlan,
  type Task540NativeAction,
  type Task540NativeBrowserReceipt,
  type Task540NativeCleanupReceipt,
  type Task540NativeEvidence,
  type Task540NativePlan,
  type Task540NativeRuntimeReceipt,
  type Task540NativeScenarioEvidence,
} from "./contracts";

export interface Task540NativeExecutionDependencies {
  executeRuntime(action: Task540NativeAction): Promise<Task540NativeRuntimeReceipt>;
  executeBrowser(action: Task540NativeAction): Promise<Task540NativeBrowserReceipt>;
  assertBrowserDrained(): void;
  finalizeCleanup(): Promise<readonly Task540NativeCleanupReceipt[]>;
  measure<T>(kind: "phase" | "scenario", name: string, operation: () => Promise<T>): Promise<T>;
  now(): number;
}

function actionGroups(plan: Task540NativePlan): readonly {
  readonly scenarioId: string;
  readonly actions: readonly Task540NativeAction[];
}[] {
  const groups: { scenarioId: string; actions: Task540NativeAction[] }[] = [];
  for (const action of plan.actionManifest) {
    const current = groups.at(-1);
    if (current?.scenarioId === action.scenario) current.actions.push(action);
    else groups.push({ scenarioId: action.scenario, actions: [action] });
  }
  const expected = ["setup", ...plan.requiredScenarios, "cleanup"];
  if (
    groups.length !== expected.length ||
    groups.some(({ scenarioId }, index) => scenarioId !== expected[index])
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 scenario sequence drifted");
  }
  return Object.freeze(
    groups.map(({ scenarioId, actions }) =>
      Object.freeze({ scenarioId, actions: Object.freeze(actions) })
    )
  );
}

async function executeActions(
  actions: readonly Task540NativeAction[],
  dependencies: Task540NativeExecutionDependencies,
  runtimeReceipts: Task540NativeRuntimeReceipt[],
  browserReceipts: Task540NativeBrowserReceipt[]
): Promise<void> {
  for (const action of actions) {
    if (action.executable.type === "runtime-operation") {
      const receipt = await dependencies.executeRuntime(action);
      if (receipt.actionId !== action.id || receipt.scenarioId !== action.scenario) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 runtime receipt reordered");
      }
      runtimeReceipts.push(receipt);
      continue;
    }
    const receipt = await dependencies.executeBrowser(action);
    if (receipt.actionId !== action.id || receipt.scenarioId !== action.scenario) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 browser receipt reordered");
    }
    browserReceipts.push(receipt);
  }
}

export async function executeTask540NativePlan(
  planInput: Task540NativePlan,
  dependencies: Task540NativeExecutionDependencies
): Promise<Task540NativeEvidence> {
  const plan = validateTask540NativePlan(planInput);
  const runtimeReceipts: Task540NativeRuntimeReceipt[] = [];
  const browserReceipts: Task540NativeBrowserReceipt[] = [];
  const scenarios: Task540NativeScenarioEvidence[] = [];

  for (const group of actionGroups(plan)) {
    if (plan.requiredScenarios.includes(group.scenarioId)) {
      const started = dependencies.now();
      await dependencies.measure("scenario", group.scenarioId, () =>
        executeActions(group.actions, dependencies, runtimeReceipts, browserReceipts)
      );
      const elapsed = dependencies.now() - started;
      if (!Number.isFinite(elapsed) || elapsed < 0) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 scenario timing drifted");
      }
      scenarios.push(
        Object.freeze({
          id: group.scenarioId,
          pass: true,
          elapsedMs: Math.max(1, Math.ceil(elapsed)),
        })
      );
    } else {
      await dependencies.measure("phase", group.scenarioId, () =>
        executeActions(group.actions, dependencies, runtimeReceipts, browserReceipts)
      );
    }
  }
  dependencies.assertBrowserDrained();
  const cleanupReceipts = await dependencies.measure("phase", "resource-cleanup", () =>
    dependencies.finalizeCleanup()
  );
  const screenshotsByPath = new Map(
    browserReceipts.flatMap((receipt) =>
      receipt.screenshot === undefined
        ? []
        : [[receipt.screenshot.path, receipt.screenshot] as const]
    )
  );
  const screenshots = plan.requiredScreenshotPaths.map((path) => {
    const screenshot = screenshotsByPath.get(path);
    if (screenshot === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 screenshot proof is absent");
    }
    return screenshot;
  });
  const consoleErrors = browserReceipts.flatMap(({ consoleErrors }) => consoleErrors);
  const pageErrors = browserReceipts.flatMap(({ pageErrors }) => pageErrors);
  return validateTask540NativeEvidence(
    Object.freeze({
      pass: true,
      serverUp: true,
      browserReceipts: Object.freeze(browserReceipts),
      runtimeReceipts: Object.freeze(runtimeReceipts),
      cleanupReceipts: Object.freeze([...cleanupReceipts]),
      scenarios: Object.freeze(scenarios),
      screenshots: Object.freeze(screenshots),
      consoleErrors: Object.freeze(consoleErrors),
      pageErrors: Object.freeze(pageErrors),
    }),
    plan
  );
}
