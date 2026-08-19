import { expect, test } from "bun:test";

import {
  TASK467_SCENARIO_IDS,
  TASK467_WIDGET_TYPE,
  projectTask467EvidencePaths,
  task467EvidenceSession,
  validateTask467ReceiptShape,
  type Task467BrowserReceipt,
} from "../../../scripts/runtime-smoke/adapters/task-467/contracts";
import {
  materializeTask467BrowserAction,
  type Task467BrowserConfig,
} from "../../../scripts/runtime-smoke/adapters/task-467/browser-actions";
import { task467AssertionsFor } from "../../../scripts/runtime-smoke/adapters/task-467/assertions";
import { buildTask467EvidenceManifest } from "../../../scripts/runtime-smoke/adapters/task-467/output-manifest";

const CONFIG: Task467BrowserConfig = {
  scenarioId: "wizard-lazy-fallback",
  adminUrl: "http://localhost:5173/admin",
  widgetType: TASK467_WIDGET_TYPE,
  chunkGlob: "**/*SectionEditors*",
  fallbackColor: "#16a34a",
  fallbackColorRgb: "rgb(22, 163, 74)",
  controlId: "section.style.backgroundColor",
  browserRunStartedAtEpochMs: 1_700_000_000_000,
};

function sampleReceipt(overrides: Partial<Task467BrowserReceipt> = {}): Task467BrowserReceipt {
  return validateTask467ReceiptShape(
    {
      ok: true,
      modeRootCount: 1,
      modeRootBoxWidth: 640,
      modeRootBoxHeight: 480,
      sectionCount: 3,
      visibleSectionCount: 3,
      writableControlCount: 2,
      controlCount: 5,
      loadingVisible: true,
      loadingBoxWidth: 400,
      loadingBoxHeight: 96,
      loadingRole: "status",
      errorVisible: false,
      retryButtonVisible: false,
      retryButtonName: null,
      previewColorBefore: "rgba(0, 0, 0, 0)",
      previewColorAfter: "rgb(22, 163, 74)",
      colorInputValue: "#16a34a",
      lightModeRootBackground: "rgb(255, 255, 255)",
      darkModeRootBackground: "rgb(9, 9, 11)",
      darkVisibleSectionCount: 3,
      mobileRootBoxWidth: 360,
      mobileRootBoxHeight: 240,
      mobileOverflow: false,
      mobileVisibleSectionCount: 3,
      previewColorAfterRoundTrip: "rgb(22, 163, 74)",
      consoleErrorDelta: 0,
      screenshotBase64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      ...overrides,
    },
    "wizard-lazy-fallback"
  );
}

test("task-467 scenario ids are stable and evidence sessions sanitize input", () => {
  expect(TASK467_SCENARIO_IDS).toEqual([
    "wizard-lazy-fallback",
    "visual-computed-style",
    "advanced-mount",
    "dark-mode",
    "cross-device-mobile",
    "lazy-failure-retry",
    "mode-round-trip-preserves-data",
  ]);
  expect(task467EvidenceSession("wf467Smoke!")).toBe("wf467smoke");
  const paths = projectTask467EvidencePaths("wf467smoke", TASK467_SCENARIO_IDS);
  expect(paths).toHaveLength(7);
  expect(new Set(paths).size).toBe(7);
  expect(paths[0]).toMatch(
    /^_docs\/_workflows\/_smoke\/task-467\/wf467smoke\/task467-01-wizard-lazy-fallback\.png$/
  );
});

test("task-467 receipt shape validation is strict", () => {
  const receipt = sampleReceipt();
  expect(receipt.ok).toBe(true);
  expect(receipt.loadingRole).toBe("status");
  expect(() =>
    validateTask467ReceiptShape(
      { ...sampleReceipt(), screenshotBase64: "" },
      "wizard-lazy-fallback"
    )
  ).toThrow();
  expect(() => validateTask467ReceiptShape(null, "wizard-lazy-fallback")).toThrow();
  const coerced = validateTask467ReceiptShape(
    {
      ...sampleReceipt(),
      modeRootCount: "not-a-number",
      screenshotBase64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    },
    "wizard-lazy-fallback"
  );
  expect(coerced.modeRootCount).toBe(0);
});

test("task-467 browser action materializes every scenario with no placeholders", () => {
  for (const scenarioId of TASK467_SCENARIO_IDS) {
    const source = materializeTask467BrowserAction({ ...CONFIG, scenarioId });
    expect(source.startsWith("async (page) => {")).toBe(true);
    expect(source).not.toContain("__ADMIN_URL__");
    expect(source).not.toContain("__WIDGET_TYPE__");
    expect(source).not.toContain("__CHUNK_GLOB__");
    expect(source).not.toContain("__CONTROL_ID__");
    expect(source).toContain("screenshotBase64");
    expect(source).toContain('data-widget-editor="');
    expect(source.includes("\0")).toBe(false);
  }
});

test("task-467 browser action failure branch returns a bounded zero receipt", () => {
  const source = materializeTask467BrowserAction(CONFIG);
  expect(source).toContain("ok: false");
  expect(source).toContain("modeRootCount: 0");
});

test("task-467 assertions cover the visible contract for every scenario", () => {
  for (const scenarioId of TASK467_SCENARIO_IDS) {
    const assertions = task467AssertionsFor(scenarioId, sampleReceipt());
    expect(assertions.length).toBeGreaterThanOrEqual(4);
    for (const entry of assertions) {
      expect(entry.pass).toBe(true);
      expect(["computed-style", "geometry", "dom-state", "aria"]).toContain(entry.kind);
      expect(typeof entry.target).toBe("string");
      expect(typeof entry.expected).toBe("string");
      expect(typeof entry.actual).toBe("string");
    }
  }
});

test("task-467 evidence manifest resolves under the workflow smoke directory", () => {
  const root = "/repo";
  const manifest = buildTask467EvidenceManifest(root, "wf467smoke");
  expect(manifest.reportPath).toBe("/repo/_docs/_workflows/_smoke/task-467/wf467smoke/report.json");
  expect(manifest.screenshotPaths).toHaveLength(7);
  expect(manifest.screenshotPaths[0]).toMatch(/task467-01-wizard-lazy-fallback\.png$/);
});
