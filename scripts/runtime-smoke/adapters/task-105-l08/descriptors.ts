import { createHash } from "node:crypto";

import { assertExactKeys, SmokeError } from "../../contracts";

/**
 * TASK-105 L08 descriptor ownership (contract: TASK-105-08-08-L07).
 *
 * `descriptors.ts` owns the exact five-scenario identity, the redacted browser
 * receipt validator, and `assertTerminalTask105L08Report`. Browser facts never
 * retain URLs, headers, bodies, tokens, credentials, or user data: only the
 * classified assertion targets, properties, and the bounded expected/actual
 * scalar pair that the driver already proved equal.
 */

export const TASK105_L08_SCENARIOS = Object.freeze([
  "page-deep-section-insert-visible-layer",
  "page-device-override-reset-publish-front-parity",
  "post-block-inspector-save-publish-front-parity",
  "post-classic-edit-preview-focus-visible",
  "post-richtext-command-slash-transition-visible",
] as const);

export type Task105L08ScenarioId = (typeof TASK105_L08_SCENARIOS)[number];

export interface Task105L08Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Task105L08ScenarioDescriptor {
  readonly id: Task105L08ScenarioId;
  readonly number: number;
  readonly title: string;
  readonly themes: readonly ("light" | "dark")[];
  readonly viewport: Task105L08Viewport;
}

/**
 * One reported variant per scenario. Together the five scenarios prove both
 * admin color modes across the page and post editor families (page: dark;
 * post: dark and light), and the two publish-parity scenarios prove the
 * public front render.
 */
export const TASK_105_L08_SCENARIO_DESCRIPTORS: readonly Task105L08ScenarioDescriptor[] =
  Object.freeze([
    Object.freeze({
      id: "page-deep-section-insert-visible-layer" as const,
      number: 1,
      title: "Page editor deep section insert and Layers active-state proof",
      themes: Object.freeze(["dark"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "page-device-override-reset-publish-front-parity" as const,
      number: 2,
      title: "Page device override, reset, publish, and front parity proof",
      themes: Object.freeze(["light"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "post-block-inspector-save-publish-front-parity" as const,
      number: 3,
      title: "Block post Inspector edit, publish, and front article parity",
      themes: Object.freeze(["light"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "post-classic-edit-preview-focus-visible" as const,
      number: 4,
      title: "Classic post edit and preview focus survival proof",
      themes: Object.freeze(["dark"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "post-richtext-command-slash-transition-visible" as const,
      number: 5,
      title: "Rich-text command and slash rerender transition proof",
      themes: Object.freeze(["light"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  ]);

export function requireTask105L08Descriptor(id: string): Task105L08ScenarioDescriptor {
  const descriptor = TASK_105_L08_SCENARIO_DESCRIPTORS.find((entry) => entry.id === id);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L08 scenario descriptor is unknown");
  }
  return descriptor;
}

/** One bounded, machine-observed visible assertion contracted for a scenario. */
export interface Task105L08FactContract {
  readonly kind: "computed-style" | "geometry" | "dom-state";
  readonly target: string;
  readonly property: string;
  /** Fixed expected scalar, or a runtime-observed parity value when null. */
  readonly expected: string | null;
  readonly pattern: RegExp;
}

const PX = /^\d{1,4}px$/u;
const FLAG = /^true$/u;

/**
 * Exact assertion map per scenario. `expected: null` marks a runtime-observed
 * parity scalar (the driver proves expected === actual before reporting).
 */
export const TASK_105_L08_SCENARIO_FACTS: readonly (
  | (Task105L08FactContract & { readonly id: "page-deep-section-insert-visible-layer" })
  | (Task105L08FactContract & { readonly id: "page-device-override-reset-publish-front-parity" })
  | (Task105L08FactContract & { readonly id: "post-block-inspector-save-publish-front-parity" })
  | (Task105L08FactContract & { readonly id: "post-classic-edit-preview-focus-visible" })
  | (Task105L08FactContract & { readonly id: "post-richtext-command-slash-transition-visible" })
)[] = Object.freeze([
  Object.freeze({
    id: "page-deep-section-insert-visible-layer" as const,
    kind: "dom-state" as const,
    target: "page-editor-active-layer",
    property: "active-layer",
    expected: "true",
    pattern: FLAG,
  }),
  Object.freeze({
    id: "page-deep-section-insert-visible-layer" as const,
    kind: "geometry" as const,
    target: "page-editor-active-section",
    property: "bounded-geometry",
    expected: "true",
    pattern: FLAG,
  }),
  Object.freeze({
    id: "page-device-override-reset-publish-front-parity" as const,
    kind: "computed-style" as const,
    target: "front-page-section-heading",
    property: "font-size",
    expected: null,
    pattern: PX,
  }),
  Object.freeze({
    id: "post-block-inspector-save-publish-front-parity" as const,
    kind: "dom-state" as const,
    target: "front-post-block-text",
    property: "inspector-text",
    expected: "true",
    pattern: FLAG,
  }),
  Object.freeze({
    id: "post-classic-edit-preview-focus-visible" as const,
    kind: "dom-state" as const,
    target: "classic-preview-focus",
    property: "focus-visible",
    expected: "true",
    pattern: FLAG,
  }),
  Object.freeze({
    id: "post-richtext-command-slash-transition-visible" as const,
    kind: "dom-state" as const,
    target: "richtext-rendered-state",
    property: "command-applied",
    expected: "true",
    pattern: FLAG,
  }),
]);

export function task105L08FactsFor(id: Task105L08ScenarioId): readonly Task105L08FactContract[] {
  return Object.freeze(TASK_105_L08_SCENARIO_FACTS.filter((fact) => fact.id === id));
}

/** Surface where the scenario's reported variant is observed. */
export const TASK_105_L08_SCENARIO_SURFACES: Readonly<
  Record<Task105L08ScenarioId, "admin" | "public">
> = Object.freeze({
  "page-deep-section-insert-visible-layer": "admin",
  "page-device-override-reset-publish-front-parity": "public",
  "post-block-inspector-save-publish-front-parity": "public",
  "post-classic-edit-preview-focus-visible": "admin",
  "post-richtext-command-slash-transition-visible": "admin",
});

function fail(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

/** One bounded visible fact reported by the real driver. */
export interface Task105L08VisibleFact {
  readonly kind: Task105L08FactContract["kind"];
  readonly target: string;
  readonly property: string;
  readonly expected: string;
  readonly actual: string;
  readonly pass: true;
}

/** One sealed scenario observation: one variant, zero console/page errors. */
export interface Task105L08ScenarioEvidence {
  readonly scenarioId: Task105L08ScenarioId;
  readonly theme: "light" | "dark";
  readonly surface: "admin" | "public";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly facts: readonly Task105L08VisibleFact[];
}

/** Aggregate redacted browser receipt for the whole suite run. */
export interface Task105L08BrowserReceipt {
  readonly scenarioIds: readonly string[];
  readonly consoleErrorCount: 0;
  readonly pageErrorCount: 0;
  readonly scenarios: readonly Task105L08ScenarioEvidence[];
}

function isTheme(value: unknown): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

function isSurface(value: unknown): value is "admin" | "public" {
  return value === "admin" || value === "public";
}

function validateFact(candidate: unknown, contract: Task105L08FactContract): Task105L08VisibleFact {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) {
    fail("TASK-105 L08 visible fact is not a plain object");
  }
  assertExactKeys(
    candidate as Record<string, unknown>,
    ["kind", "target", "property", "expected", "actual", "pass"],
    "TASK-105 L08 visible fact"
  );
  const fact = candidate as Record<string, unknown>;
  if (
    fact.kind !== contract.kind ||
    fact.target !== contract.target ||
    fact.property !== contract.property ||
    typeof fact.expected !== "string" ||
    typeof fact.actual !== "string" ||
    fact.expected !== fact.actual ||
    !contract.pattern.test(fact.expected) ||
    fact.pass !== true
  ) {
    fail("TASK-105 L08 visible fact does not match its contracted assertion");
  }
  return Object.freeze({
    kind: contract.kind,
    target: contract.target,
    property: contract.property,
    expected: fact.expected,
    actual: fact.actual,
    pass: true,
  });
}

function validateScenarioEvidence(candidate: unknown, index: number): Task105L08ScenarioEvidence {
  const descriptor = TASK_105_L08_SCENARIO_DESCRIPTORS[index];
  if (descriptor === undefined) fail("TASK-105 L08 scenario evidence ordinal is invalid");
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) {
    fail("TASK-105 L08 scenario evidence is not a plain object");
  }
  assertExactKeys(
    candidate as Record<string, unknown>,
    ["scenarioId", "theme", "surface", "viewport", "facts"],
    "TASK-105 L08 scenario evidence"
  );
  const evidence = candidate as Record<string, unknown>;
  if (evidence.scenarioId !== descriptor.id) {
    fail("TASK-105 L08 scenario evidence identity drifted");
  }
  if (!isTheme(evidence.theme) || !descriptor.themes.includes(evidence.theme)) {
    fail("TASK-105 L08 scenario evidence theme is not contracted");
  }
  if (
    !isSurface(evidence.surface) ||
    evidence.surface !== TASK_105_L08_SCENARIO_SURFACES[descriptor.id]
  ) {
    fail("TASK-105 L08 scenario evidence surface is not contracted");
  }
  const viewport = evidence.viewport;
  if (
    viewport === null ||
    typeof viewport !== "object" ||
    Array.isArray(viewport) ||
    Object.getPrototypeOf(viewport) !== Object.prototype
  ) {
    fail("TASK-105 L08 scenario viewport is not a plain object");
  }
  assertExactKeys(viewport as Record<string, unknown>, ["width", "height"], "scenario viewport");
  const size = viewport as Record<string, unknown>;
  if (
    size.width !== descriptor.viewport.width ||
    size.height !== descriptor.viewport.height ||
    typeof size.width !== "number" ||
    typeof size.height !== "number"
  ) {
    fail("TASK-105 L08 scenario viewport is not contracted");
  }
  const contracts = task105L08FactsFor(descriptor.id);
  if (!Array.isArray(evidence.facts) || evidence.facts.length !== contracts.length) {
    fail("TASK-105 L08 scenario fact cardinality is invalid");
  }
  const facts = evidence.facts.map((fact, factIndex) =>
    validateFact(fact, contracts[factIndex] as Task105L08FactContract)
  );
  return Object.freeze({
    scenarioId: descriptor.id,
    theme: evidence.theme,
    surface: evidence.surface,
    viewport: Object.freeze({
      width: descriptor.viewport.width,
      height: descriptor.viewport.height,
    }),
    facts: Object.freeze(facts),
  });
}

/** Validates one bounded, redacted, zero-error browser receipt. */
export function validateTask105L08BrowserReceipt(candidate: unknown): Task105L08BrowserReceipt {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) {
    fail("TASK-105 L08 browser receipt is not a plain object");
  }
  assertExactKeys(
    candidate as Record<string, unknown>,
    ["scenarioIds", "consoleErrorCount", "pageErrorCount", "scenarios"],
    "TASK-105 L08 browser receipt"
  );
  const receipt = candidate as Record<string, unknown>;
  if (
    !Array.isArray(receipt.scenarioIds) ||
    receipt.scenarioIds.length !== TASK_105_L08_SCENARIO_DESCRIPTORS.length ||
    !receipt.scenarioIds.every((id, index) => id === TASK_105_L08_SCENARIO_DESCRIPTORS[index]?.id)
  ) {
    fail("TASK-105 L08 receipt scenario identity is invalid");
  }
  if (receipt.consoleErrorCount !== 0 || receipt.pageErrorCount !== 0) {
    fail("TASK-105 L08 receipt requires zero console and page errors");
  }
  if (!Array.isArray(receipt.scenarios)) {
    fail("TASK-105 L08 receipt scenarios are absent");
  }
  if (receipt.scenarios.length !== TASK_105_L08_SCENARIO_DESCRIPTORS.length) {
    fail("TASK-105 L08 receipt scenario cardinality is invalid");
  }
  const scenarios = receipt.scenarios.map((scenario, index) =>
    validateScenarioEvidence(scenario, index)
  );
  return Object.freeze({
    scenarioIds: Object.freeze([...receipt.scenarioIds] as string[]),
    consoleErrorCount: 0,
    pageErrorCount: 0,
    scenarios: Object.freeze(scenarios),
  });
}

/** Safe digest/count projection of a validated receipt into shared results. */
export function projectTask105L08Receipt(input: { readonly receipt: unknown }): {
  readonly consoleErrors: readonly string[];
  readonly receiptDigest: string;
} {
  const validated = validateTask105L08BrowserReceipt(input.receipt);
  const digestPayload = JSON.stringify({
    s: validated.scenarios,
    c: validated.consoleErrorCount,
    p: validated.pageErrorCount,
  });
  return Object.freeze({
    consoleErrors: Object.freeze([]),
    receiptDigest: createSha256(digestPayload),
  });
}

export function createSha256(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export interface Task105L08TerminalExpectation {
  readonly exitCode: number;
  readonly suiteId: "task-105-l08";
  readonly profile: "fast" | "certification";
  readonly session: string;
}

const TERMINAL_REPORT_KEYS = Object.freeze([
  "schemaVersion",
  "suiteId",
  "profile",
  "session",
  "pass",
  "serverUp",
  "timings",
  "processes",
  "snapshots",
  "scenarios",
  "screenshots",
  "consoleErrors",
  "suiteCleanup",
  "cleanup",
  "failures",
]);

const TERMINAL_CLEANUP = Object.freeze({
  contract: "task-105-l08-runtime-v1",
  settingsRestore: "registered",
  fixtureCleanup: "registered",
  workspace: "registered",
  devHost: "registered",
  browserDispatch: "registered",
  cleanupOwner: "shared-lifecycle",
});

/** Registration attestation the adapter returns; the shared lifecycle owns the verdict. */
export function createTask105L08CleanupAttestation(
  receiptDigest: string
): Readonly<Record<string, boolean | number | string>> {
  if (!/^[a-f0-9]{64}$/u.test(receiptDigest)) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L08 receipt digest is invalid");
  }
  return Object.freeze({
    ...TERMINAL_CLEANUP,
    receiptDigest,
  });
}

const TERMINAL_TIMING_KINDS = Object.freeze([
  "suite",
  "phase",
  "scenario",
  "process",
  "snapshot",
  "cleanup",
]);

function terminalRecord(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} is not a plain object`);
  }
  return value as Record<string, unknown>;
}

function terminalInteger(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum)
    fail(`${label} is invalid`);
  return value;
}

function validateTerminalTimings(value: unknown): void {
  if (!Array.isArray(value) || value.length < 2 || value.length > 64)
    fail("terminal report timings are invalid");
  const seen = new Set<string>();
  for (const receipt of value) {
    const timing = terminalRecord(receipt, "terminal timing");
    assertExactKeys(timing, ["kind", "name", "count", "failed", "elapsedMs"], "terminal timing");
    if (
      !TERMINAL_TIMING_KINDS.includes(String(timing.kind)) ||
      typeof timing.name !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(timing.name) ||
      terminalInteger(timing.count, "terminal timing count", 1) < 1 ||
      terminalInteger(timing.failed, "terminal timing failed") !== 0 ||
      terminalInteger(timing.elapsedMs, "terminal timing elapsed") < 0
    ) {
      fail("terminal report timing receipt is invalid");
    }
    const key = `${String(timing.kind)} ${String(timing.name)}`;
    if (seen.has(key)) fail("terminal report timing receipt is duplicated");
    seen.add(key);
  }
  if (!seen.has("suite task-105-l08") || !seen.has("cleanup all")) {
    fail("terminal report timing coverage is incomplete");
  }
}

function validateTerminalProcesses(value: unknown): void {
  const processes = terminalRecord(value, "terminal report processes");
  const entries = Object.entries(processes);
  if (entries.length < 2 || entries.length > 64) fail("terminal report process count is invalid");
  for (const [family, starts] of entries) {
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(family))
      fail("terminal report process family is invalid");
    terminalInteger(starts, "terminal report process starts", 1);
  }
  if (processes["task-105-l08-dev-host"] !== 1 || processes["playwright-open"] !== 1) {
    fail("terminal report required process receipts are absent");
  }
}

function validateTerminalCleanup(value: unknown): void {
  const cleanup = terminalRecord(value, "terminal report cleanup");
  assertExactKeys(cleanup, ["pass", "failures"], "terminal report cleanup");
  if (cleanup.pass !== true || !Array.isArray(cleanup.failures) || cleanup.failures.length !== 0) {
    fail("terminal report cleanup did not pass");
  }
}

function validateTerminalSuiteCleanup(value: unknown): void {
  const cleanup = terminalRecord(value, "terminal report suite cleanup");
  assertExactKeys(
    cleanup,
    [...Object.keys(TERMINAL_CLEANUP), "receiptDigest"],
    "terminal report suite cleanup"
  );
  if (Object.entries(TERMINAL_CLEANUP).some(([key, expected]) => cleanup[key] !== expected)) {
    fail("terminal report suite cleanup receipt is invalid");
  }
  if (typeof cleanup.receiptDigest !== "string" || !/^[a-f0-9]{64}$/u.test(cleanup.receiptDigest)) {
    fail("terminal report suite cleanup digest is invalid");
  }
}

interface TerminalScreenshot {
  readonly path: string;
  readonly sha256: string;
}

function validateTerminalScreenshot(value: unknown, label: string): TerminalScreenshot {
  const screenshot = terminalRecord(value, label);
  assertExactKeys(screenshot, ["path", "sha256"], label);
  if (
    typeof screenshot.path !== "string" ||
    !/^screenshots\/[a-z0-9][a-z0-9-]*\.png$/u.test(screenshot.path) ||
    typeof screenshot.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(screenshot.sha256)
  ) {
    fail(`${label} is invalid`);
  }
  return Object.freeze({ path: screenshot.path, sha256: screenshot.sha256 });
}

function validateTerminalScenario(
  value: unknown,
  descriptor: Task105L08ScenarioDescriptor
): TerminalScreenshot {
  const scenario = terminalRecord(value, `terminal report scenario ${descriptor.id}`);
  assertExactKeys(
    scenario,
    ["id", "pass", "elapsedMs", "title", "variants", "screenshots"],
    `terminal report scenario ${descriptor.id}`
  );
  const contracts = task105L08FactsFor(descriptor.id);
  if (
    scenario.id !== descriptor.id ||
    scenario.pass !== true ||
    scenario.title !== descriptor.title ||
    terminalInteger(scenario.elapsedMs, `terminal report scenario ${descriptor.id} elapsed`) < 0 ||
    !Array.isArray(scenario.variants) ||
    scenario.variants.length !== 1 ||
    !Array.isArray(scenario.screenshots) ||
    scenario.screenshots.length !== 1
  ) {
    fail(`terminal report scenario ${descriptor.id} is not passing`);
  }
  const variant = terminalRecord(
    scenario.variants[0],
    `terminal scenario ${descriptor.id} variant`
  );
  assertExactKeys(
    variant,
    ["id", "surface", "theme", "viewport", "assertions", "consoleErrors"],
    `terminal scenario ${descriptor.id} variant`
  );
  const viewport = terminalRecord(variant.viewport, `terminal scenario ${descriptor.id} viewport`);
  assertExactKeys(viewport, ["width", "height"], `terminal scenario ${descriptor.id} viewport`);
  if (
    variant.surface !== TASK_105_L08_SCENARIO_SURFACES[descriptor.id] ||
    !isTheme(variant.theme) ||
    !descriptor.themes.includes(variant.theme) ||
    variant.id !== `${String(variant.surface)}-${String(variant.theme)}` ||
    viewport.width !== descriptor.viewport.width ||
    viewport.height !== descriptor.viewport.height ||
    !Array.isArray(variant.consoleErrors) ||
    variant.consoleErrors.length !== 0 ||
    !Array.isArray(variant.assertions) ||
    variant.assertions.length !== contracts.length
  ) {
    fail(`terminal report scenario ${descriptor.id} visible variant is invalid`);
  }
  const assertions = variant.assertions.map((assertion, index) => {
    const contract = contracts[index] as Task105L08FactContract;
    const record = terminalRecord(
      assertion,
      `terminal scenario ${descriptor.id} assertion ${index + 1}`
    );
    assertExactKeys(
      record,
      ["kind", "target", "property", "expected", "actual", "pass"],
      `terminal scenario ${descriptor.id} assertion ${index + 1}`
    );
    if (
      record.kind !== contract.kind ||
      record.target !== contract.target ||
      record.property !== contract.property ||
      typeof record.expected !== "string" ||
      typeof record.actual !== "string" ||
      record.expected !== record.actual ||
      !contract.pattern.test(record.expected) ||
      record.pass !== true
    ) {
      fail(`terminal report scenario ${descriptor.id} visible assertion ${index + 1} is invalid`);
    }
    return Object.freeze({
      kind: contract.kind,
      target: contract.target,
      property: contract.property,
      expected: record.expected,
      actual: record.actual,
      pass: true,
    });
  });
  const screenshot = validateTerminalScreenshot(
    scenario.screenshots[0],
    `terminal report scenario ${descriptor.id} screenshot`
  );
  return Object.freeze({ scenarioAssertions: assertions, screenshot }).screenshot;
}

/** Exact terminal runner-report validator (Phase-3 receipt proof). */
export function assertTerminalTask105L08Report(
  report: unknown,
  expected: Task105L08TerminalExpectation
): void {
  if (
    report === null ||
    typeof report !== "object" ||
    Array.isArray(report) ||
    Object.getPrototypeOf(report) !== Object.prototype
  ) {
    fail("terminal report is not a plain object");
  }
  assertExactKeys(report as Record<string, unknown>, TERMINAL_REPORT_KEYS, "terminal report");
  const value = report as Record<string, unknown>;
  if (value.schemaVersion !== 1) fail("terminal report schema version is unsupported");
  if (expected.exitCode !== 0) fail("terminal report exit code is non-zero");
  if (
    value.suiteId !== expected.suiteId ||
    value.profile !== expected.profile ||
    value.session !== expected.session
  ) {
    fail("terminal report identity does not match the invocation");
  }
  if (value.pass !== true || value.serverUp !== true)
    fail("terminal report pass/server state is not passing");
  validateTerminalTimings(value.timings);
  validateTerminalProcesses(value.processes);
  terminalInteger(value.snapshots, "terminal report snapshots", 2);
  if (!Array.isArray(value.consoleErrors) || value.consoleErrors.length !== 0)
    fail("terminal report console receipt is not clean");
  validateTerminalSuiteCleanup(value.suiteCleanup);
  validateTerminalCleanup(value.cleanup);
  if (!Array.isArray(value.failures) || value.failures.length !== 0) {
    fail("terminal report carries failures");
  }
  const scenarios = value.scenarios;
  if (!Array.isArray(scenarios) || scenarios.length !== TASK105_L08_SCENARIOS.length) {
    fail("terminal report scenario count is invalid");
  }
  const scenarioScreenshots: TerminalScreenshot[] = [];
  for (const [index, scenario] of scenarios.entries()) {
    const descriptor = TASK_105_L08_SCENARIO_DESCRIPTORS[index];
    if (descriptor === undefined) fail(`terminal report scenario ${index} is unknown`);
    scenarioScreenshots.push(validateTerminalScenario(scenario, descriptor));
  }
  if (
    !Array.isArray(value.screenshots) ||
    value.screenshots.length !== TASK105_L08_SCENARIOS.length
  ) {
    fail("terminal report screenshot count is invalid");
  }
  const screenshots = value.screenshots.map((screenshot, index) =>
    validateTerminalScreenshot(screenshot, `terminal report screenshot ${index + 1}`)
  );
  if (
    new Set(screenshots.map(({ path }) => path)).size !== screenshots.length ||
    screenshots.some(
      (screenshot, index) =>
        screenshot.path !== scenarioScreenshots[index]?.path ||
        screenshot.sha256 !== scenarioScreenshots[index]?.sha256
    )
  ) {
    fail("terminal report screenshot union drifted");
  }
}
