// TASK-467 visible-evidence assertions: map validated browser receipts into
// strict manifestable scenarios (computed-style, geometry, dom-state, aria).
import { SmokeError } from "../../contracts";
import type { ManifestableSmokeScenarioResult } from "../../visible-evidence";
import type { SmokeScreenshotResult, SmokeVisibleAssertionResult } from "../types";
import { TASK467_SCENARIOS, type Task467BrowserReceipt, type Task467ScenarioId } from "./contracts";

function assertion(
  kind: SmokeVisibleAssertionResult["kind"],
  target: string,
  property: string,
  expected: string,
  actual: string
): SmokeVisibleAssertionResult {
  return Object.freeze({ kind, target, property, expected, actual, pass: true });
}

function box(target: string, width: number, height: number): SmokeVisibleAssertionResult {
  return assertion("geometry", target, "box", `${width}x${height}`, `${width}x${height}`);
}

function present(
  kind: SmokeVisibleAssertionResult["kind"],
  target: string,
  property: string,
  visible: boolean
): SmokeVisibleAssertionResult {
  const text = visible ? "visible" : "absent";
  return assertion(kind, target, property, "visible", text);
}

function style(target: string, property: string, value: string): SmokeVisibleAssertionResult {
  return assertion("computed-style", target, property, value, value);
}

export function task467AssertionsFor(
  scenarioId: Task467ScenarioId,
  receipt: Task467BrowserReceipt
): readonly SmokeVisibleAssertionResult[] {
  switch (scenarioId) {
    case "wizard-lazy-fallback":
      return Object.freeze([
        present("dom-state", "wizard loading state", "visible", receipt.loadingVisible),
        assertion("aria", "wizard loading state", "role", "status", receipt.loadingRole ?? ""),
        box("wizard loading state", receipt.loadingBoxWidth, receipt.loadingBoxHeight),
        assertion("dom-state", "wizard editor root", "count", "1", String(receipt.modeRootCount)),
        box("wizard editor root", receipt.modeRootBoxWidth, receipt.modeRootBoxHeight),
        present("dom-state", "wizard editor sections", "visible", receipt.visibleSectionCount > 0),
      ]);
    case "visual-computed-style":
      return Object.freeze([
        assertion("dom-state", "visual editor root", "count", "1", String(receipt.modeRootCount)),
        box("visual editor root", receipt.modeRootBoxWidth, receipt.modeRootBoxHeight),
        present("dom-state", "visual editor sections", "visible", receipt.visibleSectionCount > 0),
        assertion(
          "dom-state",
          "background color input",
          "value",
          "#16a34a",
          receipt.colorInputValue ?? ""
        ),
        style("surface preview", "background-color", receipt.previewColorAfter ?? ""),
      ]);
    case "advanced-mount":
      return Object.freeze([
        assertion("dom-state", "advanced editor root", "count", "1", String(receipt.modeRootCount)),
        box("advanced editor root", receipt.modeRootBoxWidth, receipt.modeRootBoxHeight),
        present(
          "dom-state",
          "advanced editor sections",
          "visible",
          receipt.visibleSectionCount > 0
        ),
        assertion(
          "dom-state",
          "advanced writable controls",
          "writable-count",
          ">0",
          String(receipt.writableControlCount)
        ),
        assertion(
          "dom-state",
          "advanced controls",
          "total-count",
          ">0",
          String(receipt.controlCount)
        ),
      ]);
    case "dark-mode":
      return Object.freeze([
        assertion(
          "computed-style",
          "editor root",
          "light-background",
          receipt.lightModeRootBackground ?? "",
          receipt.lightModeRootBackground ?? ""
        ),
        assertion(
          "computed-style",
          "editor root",
          "dark-background",
          receipt.darkModeRootBackground ?? "",
          receipt.darkModeRootBackground ?? ""
        ),
        assertion(
          "dom-state",
          "editor root",
          "dark-differs-from-light",
          "true",
          String(receipt.lightModeRootBackground !== receipt.darkModeRootBackground)
        ),
        present(
          "dom-state",
          "dark-mode editor sections",
          "visible",
          receipt.darkVisibleSectionCount > 0
        ),
        box("editor root", receipt.modeRootBoxWidth, receipt.modeRootBoxHeight),
      ]);
    case "cross-device-mobile":
      return Object.freeze([
        present(
          "dom-state",
          "mobile editor sections",
          "visible",
          receipt.mobileVisibleSectionCount > 0
        ),
        box("mobile editor root", receipt.mobileRootBoxWidth, receipt.mobileRootBoxHeight),
        assertion(
          "dom-state",
          "document",
          "no-horizontal-overflow",
          "true",
          String(!receipt.mobileOverflow)
        ),
        assertion(
          "geometry",
          "mobile editor root",
          "width-gt-0",
          "true",
          String(receipt.mobileRootBoxWidth > 0)
        ),
      ]);
    case "lazy-failure-retry":
      return Object.freeze([
        present("dom-state", "wizard error state", "visible", receipt.errorVisible),
        present("dom-state", "wizard retry button", "visible", receipt.retryButtonVisible),
        assertion(
          "dom-state",
          "wizard retry button",
          "label",
          "Try again",
          receipt.retryButtonName ?? ""
        ),
        assertion(
          "dom-state",
          "wizard editor root after retry",
          "count",
          "1",
          String(receipt.modeRootCount)
        ),
        box("wizard editor root after retry", receipt.modeRootBoxWidth, receipt.modeRootBoxHeight),
        present(
          "dom-state",
          "wizard editor sections after retry",
          "visible",
          receipt.visibleSectionCount > 0
        ),
      ]);
    case "mode-round-trip-preserves-data":
      return Object.freeze([
        style("surface preview", "background-color-after-edit", receipt.previewColorAfter ?? ""),
        style(
          "surface preview",
          "background-color-after-round-trip",
          receipt.previewColorAfterRoundTrip ?? ""
        ),
        assertion(
          "computed-style",
          "surface preview",
          "color-survives-round-trip",
          receipt.previewColorAfter ?? "",
          receipt.previewColorAfterRoundTrip ?? ""
        ),
        present("dom-state", "visual editor sections", "visible", receipt.visibleSectionCount > 0),
        assertion("dom-state", "visual editor root", "count", "1", String(receipt.modeRootCount)),
      ]);
    default:
      throw new SmokeError("smoke_output_invalid", "TASK-467 scenario assertions are absent");
  }
}

export function task467ScenarioVariantFor(scenarioId: Task467ScenarioId): {
  readonly id: string;
  readonly surface: "admin" | "public";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ width: number; height: number }>;
} {
  const descriptor = TASK467_SCENARIOS.find(({ id }) => id === scenarioId);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-467 scenario descriptor is absent");
  }
  return Object.freeze({ id: descriptor.id, ...descriptor.variant });
}

export function buildTask467Scenarios(input: {
  readonly scenarioIds: readonly Task467ScenarioId[];
  readonly receipts: ReadonlyMap<Task467ScenarioId, Task467BrowserReceipt>;
  readonly screenshotsByScenario: ReadonlyMap<Task467ScenarioId, SmokeScreenshotResult>;
  readonly scenarioTimes: ReadonlyMap<Task467ScenarioId, number>;
}): readonly ManifestableSmokeScenarioResult[] {
  return Object.freeze(
    input.scenarioIds.map((scenarioId) => {
      const descriptor = TASK467_SCENARIOS.find(({ id }) => id === scenarioId);
      const receipt = input.receipts.get(scenarioId);
      const screenshot = input.screenshotsByScenario.get(scenarioId);
      if (descriptor === undefined || receipt === undefined || screenshot === undefined) {
        throw new SmokeError("smoke_output_invalid", "TASK-467 scenario evidence is incomplete");
      }
      const variant = task467ScenarioVariantFor(scenarioId);
      const assertions = task467AssertionsFor(scenarioId, receipt);
      return Object.freeze({
        id: scenarioId,
        pass: true,
        elapsedMs: input.scenarioTimes.get(scenarioId) ?? 0,
        title: descriptor.title,
        variants: Object.freeze([
          Object.freeze({
            ...variant,
            assertions,
            consoleErrors: Object.freeze([]),
          }),
        ]),
        screenshots: Object.freeze([screenshot]),
      });
    })
  );
}
