import { createHash } from "node:crypto";

import { assertExactKeys, SmokeError } from "../../contracts";

/**
 * TASK-105 L05 descriptor ownership (contract: TASK-105-08-05-L04).
 *
 * `descriptors.ts` owns the exact five-scenario identity, the redacted browser
 * receipt validator, and `assertTerminalTask105L05Report`. Browser facts never
 * retain URLs, headers, bodies, tokens, setting values, user data, or browser
 * error text: only classified endpoint IDs, methods, statuses, and counts.
 */

export const TASK105_L05_SCENARIOS = Object.freeze([
  "menu-structure-save-publish-parity",
  "menu-design-appearance-visible-effect",
  "dashboard-edit-configure-save",
  "dashboard-dirty-remote-stale",
  "solution-kit-select-reviewed-handoff",
] as const);

export type Task105L05ScenarioId = (typeof TASK105_L05_SCENARIOS)[number];

export interface Task105L05Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Task105L05ScenarioDescriptor {
  readonly id: Task105L05ScenarioId;
  readonly number: number;
  readonly title: string;
  readonly themes: readonly ("light" | "dark")[];
  readonly viewport: Task105L05Viewport;
}

export const TASK_105_L05_SCENARIO_DESCRIPTORS: readonly Task105L05ScenarioDescriptor[] =
  Object.freeze([
    Object.freeze({
      id: "menu-structure-save-publish-parity" as const,
      number: 1,
      title: "Menu structure save and publish parity through Site Shell",
      themes: Object.freeze(["light", "dark"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "menu-design-appearance-visible-effect" as const,
      number: 2,
      title: "Menu design appearance control proves a visible effect",
      themes: Object.freeze(["light"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "dashboard-edit-configure-save" as const,
      number: 3,
      title: "Dashboard customize, configure, save, reload geometry proof",
      themes: Object.freeze(["dark"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "dashboard-dirty-remote-stale" as const,
      number: 4,
      title: "Dirty dashboard draft observes a remote save broadcast on page B",
      themes: Object.freeze(["light"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
    Object.freeze({
      id: "solution-kit-select-reviewed-handoff" as const,
      number: 5,
      title: "Solution kit selection and reviewed LLM guide handoff state",
      themes: Object.freeze(["light", "dark"] as const),
      viewport: Object.freeze({ width: 1440, height: 900 }),
    }),
  ]);

export function requireTask105L05Descriptor(id: string): Task105L05ScenarioDescriptor {
  const descriptor = TASK_105_L05_SCENARIO_DESCRIPTORS.find((entry) => entry.id === id);
  if (descriptor === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 scenario descriptor is unknown");
  }
  return descriptor;
}

/** Bootstrap endpoints every freshly loaded authenticated admin document must hit. */
export const TASK105_L05_BOOTSTRAP_ENDPOINTS = Object.freeze([
  { endpointId: "auth-me", method: "GET", status: 200 },
  { endpointId: "auth-install-status", method: "GET", status: 200 },
  { endpointId: "settings-list", method: "GET", status: 200 },
  { endpointId: "custom-screens-list", method: "GET", status: 200 },
  { endpointId: "solution-kits-list", method: "GET", status: 200 },
] as const);

// 3 contracted admin document loads × 2 bootstrap auth facts = 6; the
// remaining 6 admits the auth/csrf forwards of the contracted write flows
// (menu save+publish, site shell, dashboard layout save, kit selection)
// — raised from 8 after r50 measured the real topology (budget was
// exceeded with all browser work green).
export const TASK105_L05_AUTH_FACT_LIMIT = 12;

const BOOTSTRAP_IDS = new Set(TASK105_L05_BOOTSTRAP_ENDPOINTS.map(({ endpointId }) => endpointId));

/** Semantic API endpoints admitted after a bootstrap epoch seals. */
export const TASK105_L05_SEMANTIC_ENDPOINTS = Object.freeze([
  "auth-csrf",
  "menus-read",
  "menus-write",
  "pages-read",
  "page-templates-read",
  "settings-read",
  "settings-write",
  "dashboard-layout-read",
  "dashboard-layout-write",
  "dashboard-widget-data-read",
  "content-types-read",
  "solution-kits-read",
  "solution-kits-runs-read",
  "solution-kit-detail",
  "assistant-status",
  "public-home-data",
  "public-popups-read",
] as const);

export type Task105L05SemanticEndpointId = (typeof TASK105_L05_SEMANTIC_ENDPOINTS)[number];

const SEMANTIC_IDS = new Set<string>(TASK105_L05_SEMANTIC_ENDPOINTS);

/** Exact successful method/status allowlist for every semantic route class. */
const SEMANTIC_SUCCESS_RESPONSES: Readonly<
  Record<
    Task105L05SemanticEndpointId,
    { readonly methods: readonly string[]; readonly status: 200 }
  >
> = Object.freeze({
  "auth-csrf": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "menus-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "menus-write": Object.freeze({ methods: Object.freeze(["POST", "PATCH", "PUT"]), status: 200 }),
  "pages-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "page-templates-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "settings-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "settings-write": Object.freeze({ methods: Object.freeze(["PATCH"]), status: 200 }),
  "dashboard-layout-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "dashboard-layout-write": Object.freeze({ methods: Object.freeze(["POST", "PUT"]), status: 200 }),
  "dashboard-widget-data-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "content-types-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "solution-kits-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "solution-kits-runs-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "solution-kit-detail": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "assistant-status": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "public-home-data": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
  "public-popups-read": Object.freeze({ methods: Object.freeze(["GET"]), status: 200 }),
});

/** Route classifications that are forbidden in every observer epoch. */
export const TASK105_L05_FORBIDDEN_ROUTE_FRAGMENTS = Object.freeze([
  "apply",
  "rollback",
  "chat",
  "plan",
  "dry-run",
  "execute",
] as const);

export interface Task105L05RequestFact {
  readonly endpointId: string;
  readonly method: string;
  readonly status: number;
  readonly count: number;
}

/** One independently sealed full bootstrap map for one authenticated document. */
export interface Task105L05BootstrapEpoch {
  readonly facts: readonly Task105L05RequestFact[];
}

export interface Task105L05BrowserReceipt {
  readonly scenarioIds: readonly string[];
  readonly consoleErrorCount: number;
  readonly pageErrorCount: number;
  readonly bootstrapEpochs: readonly Task105L05BootstrapEpoch[];
  readonly semanticFacts: readonly Task105L05RequestFact[];
  readonly authFactTotal: number;
}

function fail(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function factKey(fact: Pick<Task105L05RequestFact, "endpointId" | "method" | "status">): string {
  return `${fact.method}\u0000${fact.endpointId}\u0000${fact.status}`;
}

function isHttpMethod(value: unknown): value is "GET" | "POST" | "PATCH" | "PUT" | "DELETE" {
  return (
    value === "GET" ||
    value === "POST" ||
    value === "PATCH" ||
    value === "PUT" ||
    value === "DELETE"
  );
}

/** Rejects every semantic method/status pair outside the exact success map. */
export function isTask105L05ExpectedSemanticResponse(input: {
  readonly endpointId: string;
  readonly method: string;
  readonly status: number;
}): boolean {
  const expected = SEMANTIC_SUCCESS_RESPONSES[input.endpointId as Task105L05SemanticEndpointId];
  return (
    expected !== undefined &&
    SEMANTIC_IDS.has(input.endpointId) &&
    expected.methods.includes(input.method) &&
    input.status === expected.status
  );
}

function validateFacts(
  facts: unknown,
  label: string,
  allowedIds: Set<string>,
  responseValidator: (endpointId: string, method: string, status: number) => boolean
): Task105L05RequestFact[] {
  if (!Array.isArray(facts) || facts.length === 0 || facts.length > 24) {
    fail(`${label} cardinality is invalid`);
  }
  const out: Task105L05RequestFact[] = [];
  for (const fact of facts) {
    if (
      fact === null ||
      typeof fact !== "object" ||
      Array.isArray(fact) ||
      Object.getPrototypeOf(fact) !== Object.prototype
    ) {
      fail(`${label} fact is not a plain object`);
    }
    assertExactKeys(
      fact as Record<string, unknown>,
      ["endpointId", "method", "status", "count"],
      `${label} fact`
    );
    const record = fact as Record<string, unknown>;
    const endpointId = record.endpointId;
    const method = record.method;
    const status = record.status;
    const count = record.count;
    if (
      typeof endpointId !== "string" ||
      !allowedIds.has(endpointId) ||
      !isHttpMethod(method) ||
      typeof status !== "number" ||
      !Number.isSafeInteger(status) ||
      !responseValidator(endpointId, method, status) ||
      typeof count !== "number" ||
      !Number.isSafeInteger(count) ||
      count <= 0
    ) {
      fail(`${label} fact is invalid or unclassified`);
    }
    const candidate = { endpointId, method, status, count };
    if (out.some((entry) => factKey(entry) === factKey(candidate))) {
      fail(`${label} fact is duplicated`);
    }
    out.push(Object.freeze(candidate));
  }
  return out;
}

function validateBootstrapEpoch(candidate: unknown, index: number): Task105L05BootstrapEpoch {
  const label = `TASK-105 L05 bootstrap epoch ${index + 1}`;
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) {
    fail(`${label} is not a plain object`);
  }
  assertExactKeys(candidate as Record<string, unknown>, ["facts"], label);
  const facts = validateFacts(
    (candidate as Record<string, unknown>).facts,
    `${label} facts`,
    BOOTSTRAP_IDS,
    (endpointId, method, status) => {
      const expected = TASK105_L05_BOOTSTRAP_ENDPOINTS.find(
        (entry) => entry.endpointId === endpointId
      );
      return expected?.method === method && expected.status === status;
    }
  );
  if (facts.length !== TASK105_L05_BOOTSTRAP_ENDPOINTS.length) {
    fail(`${label} does not contain the exact bootstrap map`);
  }
  for (const expected of TASK105_L05_BOOTSTRAP_ENDPOINTS) {
    const fact = facts.find((entry) => entry.endpointId === expected.endpointId);
    if (
      fact === undefined ||
      fact.method !== expected.method ||
      fact.status !== expected.status ||
      fact.count !== 1
    ) {
      fail(`${label} does not contain the exact bootstrap map`);
    }
  }
  return Object.freeze({ facts: Object.freeze(facts) });
}

/**
 * Validates one bounded, redacted browser receipt. The adapter validates the
 * cross-tab epoch topology and combined auth budget through the aggregate
 * validator below.
 */
export function validateTask105L05BrowserReceipt(candidate: unknown): Task105L05BrowserReceipt {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    Array.isArray(candidate) ||
    Object.getPrototypeOf(candidate) !== Object.prototype
  ) {
    fail("TASK-105 L05 browser receipt is not a plain object");
  }
  assertExactKeys(
    candidate as Record<string, unknown>,
    [
      "scenarioIds",
      "consoleErrorCount",
      "pageErrorCount",
      "bootstrapEpochs",
      "semanticFacts",
      "authFactTotal",
    ],
    "TASK-105 L05 browser receipt"
  );
  const receipt = candidate as Record<string, unknown>;
  const scenarioIds = receipt.scenarioIds;
  if (
    !Array.isArray(scenarioIds) ||
    scenarioIds.length !== TASK_105_L05_SCENARIO_DESCRIPTORS.length ||
    !scenarioIds.every((id, index) => id === TASK_105_L05_SCENARIO_DESCRIPTORS[index]?.id)
  ) {
    fail("TASK-105 L05 receipt scenario identity is invalid");
  }
  const consoleErrorCount = receipt.consoleErrorCount;
  const pageErrorCount = receipt.pageErrorCount;
  if (
    consoleErrorCount !== 0 ||
    pageErrorCount !== 0 ||
    typeof consoleErrorCount !== "number" ||
    typeof pageErrorCount !== "number"
  ) {
    fail("TASK-105 L05 receipt requires zero console and page errors");
  }
  const epochs = receipt.bootstrapEpochs;
  if (!Array.isArray(epochs) || epochs.length < 1 || epochs.length > 2) {
    fail("TASK-105 L05 bootstrap epoch cardinality is invalid");
  }
  const bootstrapEpochs = epochs.map((epoch, index) => validateBootstrapEpoch(epoch, index));
  const semanticFacts = validateFacts(
    receipt.semanticFacts,
    "TASK-105 L05 semantic facts",
    SEMANTIC_IDS,
    (endpointId, method, status) =>
      isTask105L05ExpectedSemanticResponse({ endpointId, method, status })
  );
  const authFactTotal = receipt.authFactTotal;
  const computedAuth = [...bootstrapEpochs.flatMap(({ facts }) => facts), ...semanticFacts]
    .filter((fact) => fact.endpointId.startsWith("auth-"))
    .reduce((total, fact) => total + fact.count, 0);
  if (
    typeof authFactTotal !== "number" ||
    !Number.isSafeInteger(authFactTotal) ||
    authFactTotal !== computedAuth
  ) {
    fail("TASK-105 L05 auth fact total is inconsistent");
  }
  return Object.freeze({
    scenarioIds: Object.freeze([...scenarioIds] as string[]),
    consoleErrorCount: 0,
    pageErrorCount: 0,
    bootstrapEpochs: Object.freeze(bootstrapEpochs),
    semanticFacts: Object.freeze(semanticFacts),
    authFactTotal,
  });
}

/** Enforces Page A's two and Page B's one separately sealed bootstrap epochs. */
export function validateTask105L05BrowserReceipts(input: {
  readonly receiptA: unknown;
  readonly receiptB: unknown;
}): Readonly<{ receiptA: Task105L05BrowserReceipt; receiptB: Task105L05BrowserReceipt }> {
  const receiptA = validateTask105L05BrowserReceipt(input.receiptA);
  const receiptB = validateTask105L05BrowserReceipt(input.receiptB);
  if (receiptA.bootstrapEpochs.length !== 2 || receiptB.bootstrapEpochs.length !== 1) {
    fail("TASK-105 L05 browser bootstrap epoch topology is invalid");
  }
  if (receiptA.authFactTotal + receiptB.authFactTotal > TASK105_L05_AUTH_FACT_LIMIT) {
    fail("TASK-105 L05 combined auth fact budget is exceeded");
  }
  return Object.freeze({ receiptA, receiptB });
}

/** Safe digest/count projection of a validated receipt into shared results. */
export function projectTask105L05Receipt(receipt: Task105L05BrowserReceipt): {
  readonly consoleErrors: readonly string[];
  readonly requestDigest: string;
} {
  const validated = validateTask105L05BrowserReceipt(receipt);
  const digestPayload = JSON.stringify({
    b: validated.bootstrapEpochs,
    s: validated.semanticFacts,
    c: validated.consoleErrorCount,
    p: validated.pageErrorCount,
    a: validated.authFactTotal,
  });
  return Object.freeze({
    consoleErrors: Object.freeze([]),
    requestDigest: createSha256(digestPayload),
  });
}

/** Safe aggregate projection for both independently sealed authenticated pages. */
export function projectTask105L05Receipts(input: {
  readonly receiptA: unknown;
  readonly receiptB: unknown;
}): {
  readonly consoleErrors: readonly string[];
  readonly requestDigest: string;
  readonly consoleErrorCount: 0;
  readonly pageErrorCount: 0;
} {
  const { receiptA, receiptB } = validateTask105L05BrowserReceipts(input);
  const first = projectTask105L05Receipt(receiptA);
  const second = projectTask105L05Receipt(receiptB);
  return Object.freeze({
    consoleErrors: Object.freeze([]),
    requestDigest: createSha256(`${first.requestDigest}\u0000${second.requestDigest}`),
    consoleErrorCount: 0 as const,
    pageErrorCount: 0 as const,
  });
}

export function createSha256(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export interface Task105L05TerminalExpectation {
  readonly exitCode: number;
  readonly suiteId: "task-105-l05";
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

const TERMINAL_SUITE_CLEANUP = Object.freeze({
  contract: "task-105-l05-liveness-v1",
  adapterRuntime: true,
  processSupervisor: true,
  workerPool: true,
  devHost: true,
  browserDispatch: true,
  workspace: true,
  fixtureCleanup: true,
  cleanupPass: true,
  cleanupFailures: 0,
});

const TERMINAL_RECEIPT_SUMMARY_KEYS = Object.freeze([
  "receiptDigest",
  "receiptConsoleErrors",
  "receiptPageErrors",
]);

const TERMINAL_VISIBLE_FACTS = Object.freeze({
  "menu-structure-save-publish-parity": Object.freeze({
    surface: "public",
    kind: "dom-state",
    target: "public-navigation",
    property: "fixture-link",
    expected: "true",
  }),
  "menu-design-appearance-visible-effect": Object.freeze({
    surface: "admin",
    kind: "computed-style",
    target: "menu-navigation",
    property: "font-size",
    expected: "20px",
  }),
  "dashboard-edit-configure-save": Object.freeze({
    surface: "admin",
    kind: "geometry",
    target: "quick-actions",
    property: "wide-layout",
    expected: "true",
  }),
  "dashboard-dirty-remote-stale": Object.freeze({
    surface: "admin",
    kind: "dom-state",
    target: "dashboard-draft",
    property: "stale-draft",
    expected: "true",
  }),
  "solution-kit-select-reviewed-handoff": Object.freeze({
    surface: "admin",
    kind: "dom-state",
    target: "reviewed-guide",
    property: "reviewed-prompt",
    expected: "true",
  }),
});

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
      !["suite", "phase", "scenario", "process", "snapshot", "cleanup"].includes(
        timing.kind as string
      ) ||
      typeof timing.name !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(timing.name) ||
      terminalInteger(timing.count, "terminal timing count", 1) < 1 ||
      terminalInteger(timing.failed, "terminal timing failed") !== 0 ||
      terminalInteger(timing.elapsedMs, "terminal timing elapsed") < 0
    ) {
      fail("terminal report timing receipt is invalid");
    }
    const key = `${timing.kind}\u0000${timing.name}`;
    if (seen.has(key)) fail("terminal report timing receipt is duplicated");
    seen.add(key);
  }
  if (!seen.has("suite\u0000task-105-l05") || !seen.has("cleanup\u0000all")) {
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
  if (processes["task105l05-worker-db"] !== 1 || processes["task-105-l05-dev-host"] !== 1) {
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
    [...Object.keys(TERMINAL_SUITE_CLEANUP), ...TERMINAL_RECEIPT_SUMMARY_KEYS],
    "terminal report suite cleanup"
  );
  if (
    Object.entries(TERMINAL_SUITE_CLEANUP).some(([key, expected]) => cleanup[key] !== expected) ||
    typeof cleanup.receiptDigest !== "string" ||
    !/^[a-f0-9]{64}$/u.test(cleanup.receiptDigest) ||
    cleanup.receiptConsoleErrors !== 0 ||
    cleanup.receiptPageErrors !== 0
  ) {
    fail("terminal report lifecycle liveness receipt is invalid");
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
  descriptor: Task105L05ScenarioDescriptor
): TerminalScreenshot {
  const scenario = terminalRecord(value, `terminal report scenario ${descriptor.id}`);
  assertExactKeys(
    scenario,
    ["id", "pass", "elapsedMs", "title", "variants", "screenshots"],
    `terminal report scenario ${descriptor.id}`
  );
  const fact = TERMINAL_VISIBLE_FACTS[descriptor.id];
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
    variant.surface !== fact.surface ||
    (variant.theme !== "light" && variant.theme !== "dark") ||
    variant.id !== `${variant.surface}-${variant.theme}` ||
    viewport.width !== descriptor.viewport.width ||
    viewport.height !== descriptor.viewport.height ||
    !Array.isArray(variant.consoleErrors) ||
    variant.consoleErrors.length !== 0 ||
    !Array.isArray(variant.assertions) ||
    variant.assertions.length !== 1
  ) {
    fail(`terminal report scenario ${descriptor.id} visible variant is invalid`);
  }
  const assertion = terminalRecord(
    variant.assertions[0],
    `terminal scenario ${descriptor.id} assertion`
  );
  assertExactKeys(
    assertion,
    ["kind", "target", "property", "expected", "actual", "pass"],
    `terminal scenario ${descriptor.id} assertion`
  );
  if (
    assertion.kind !== fact.kind ||
    assertion.target !== fact.target ||
    assertion.property !== fact.property ||
    assertion.expected !== fact.expected ||
    assertion.actual !== fact.expected ||
    assertion.pass !== true
  ) {
    fail(`terminal report scenario ${descriptor.id} visible assertion is invalid`);
  }
  return validateTerminalScreenshot(
    scenario.screenshots[0],
    `terminal report scenario ${descriptor.id} screenshot`
  );
}

/** Exact terminal runner-report validator. */
export function assertTerminalTask105L05Report(
  report: unknown,
  expected: Task105L05TerminalExpectation
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
  if (!Array.isArray(scenarios) || scenarios.length !== TASK105_L05_SCENARIOS.length) {
    fail("terminal report scenario count is invalid");
  }
  const scenarioScreenshots: TerminalScreenshot[] = [];
  for (const [index, scenario] of scenarios.entries()) {
    const descriptor = TASK_105_L05_SCENARIO_DESCRIPTORS[index];
    if (descriptor === undefined) fail(`terminal report scenario ${index} is unknown`);
    scenarioScreenshots.push(validateTerminalScenario(scenario, descriptor));
  }
  if (
    !Array.isArray(value.screenshots) ||
    value.screenshots.length !== TASK105_L05_SCENARIOS.length
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
