// S3 (TASK-481/539/542) shared smoke evidence schema (orchestrator-owned).
// Environment-neutral ESM: bounded smoke report schema with VISIBLE-EFFECT
// assertions (computed-style/geometry/dom-state/aria), screenshot path rules
// under _docs/_workflows/_smoke/, zero-console-error gate, server-up gate, and
// strict validation. Mirrors the repo smoke-evidence contract vocabulary so the
// three S3 implement workflows share one schema owner. Errors are
// machine-readable and never carry screenshot bytes or raw agent payloads.

const ASSERTION_KINDS = Object.freeze(["computed-style", "geometry", "dom-state", "aria"]);
const SESSION_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const PNG_PATTERN = /\.png$/u;

const MIN_SCENARIOS = 5;
const MAX_SCENARIOS = 512;
const MAX_VARIANTS_PER_SCENARIO = 64;
const MAX_ASSERTIONS_PER_VARIANT = 256;
const MAX_CONSOLE_ERRORS = 64;
const MAX_SCREENSHOTS = 512;
const MAX_FIELD_CHARS = 4096;

export class S3SmokeError extends Error {
  constructor(code, label, detail) {
    super(`${code}:${label}:${detail}`);
    this.name = "S3SmokeError";
    this.code = code;
    this.label = label;
    this.detail = detail;
  }
}

function fail(code, label, detail) {
  throw new S3SmokeError(code, label, detail);
}

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function nonEmptyBoundedString(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_FIELD_CHARS;
}

export function requireRuntimeSmokeSessionName(session, label = "smoke_session") {
  if (typeof session !== "string" || !SESSION_PATTERN.test(session)) {
    fail("invalid_session", label, String(session));
  }
  return session;
}

export function smokeScreenshotRoot(root) {
  return `${root}/_docs/_workflows/_smoke`;
}

export function smokeTaskDirectory(root, taskId) {
  if (typeof taskId !== "string" || !/^TASK-\d{3}$/u.test(taskId)) {
    fail("invalid_task_id", "smoke_task_directory", String(taskId));
  }
  return `${smokeScreenshotRoot(root)}/${taskId}`;
}

// Validates one variant's visible-effect assertion set: every variant must
// carry at least one assertion of an allowed kind with a real selector and an
// expected value, proving VISIBLE EFFECT, not mere control presence.
export function validateStrictVariant(variant, label) {
  if (!isPlainRecord(variant)) fail("invalid_variant", label, "shape");
  if (!nonEmptyBoundedString(variant.name)) fail("invalid_variant", label, "name");
  if (
    !Array.isArray(variant.assertions) ||
    variant.assertions.length < 1 ||
    variant.assertions.length > MAX_ASSERTIONS_PER_VARIANT
  ) {
    fail("invalid_variant", label, "assertions");
  }
  for (const assertion of variant.assertions) {
    if (
      !isPlainRecord(assertion) ||
      !ASSERTION_KINDS.includes(assertion.kind) ||
      !nonEmptyBoundedString(assertion.selector) ||
      !nonEmptyBoundedString(assertion.expected)
    ) {
      fail("invalid_assertion", label, JSON.stringify(assertion));
    }
  }
  return Object.freeze({ ...variant, assertions: Object.freeze(variant.assertions) });
}

export function validateStrictScenario(scenario, label) {
  if (!isPlainRecord(scenario)) fail("invalid_scenario", label, "shape");
  if (!nonEmptyBoundedString(scenario.id)) fail("invalid_scenario", label, "id");
  if (
    !Array.isArray(scenario.variants) ||
    scenario.variants.length < 1 ||
    scenario.variants.length > MAX_VARIANTS_PER_SCENARIO
  ) {
    fail("invalid_scenario", label, "variants");
  }
  scenario.variants.forEach((variant) => validateStrictVariant(variant, label));
  return Object.freeze({ ...scenario, variants: Object.freeze(scenario.variants) });
}

export function validateS3Smoke(report, label = "s3_smoke") {
  if (!isPlainRecord(report)) fail("invalid_smoke", label, "shape");
  if (report.pass !== true) fail("smoke_failed", label, report.failures?.join(";") ?? "no details");
  if (report.serverUp !== true) fail("server_down", label, "serverUp");
  if (
    !Array.isArray(report.consoleErrors) ||
    report.consoleErrors.length !== 0 ||
    report.consoleErrors.length > MAX_CONSOLE_ERRORS
  ) {
    fail("console_errors", label, JSON.stringify(report.consoleErrors ?? []));
  }
  if (
    !Array.isArray(report.scenarios) ||
    report.scenarios.length < MIN_SCENARIOS ||
    report.scenarios.length > MAX_SCENARIOS
  ) {
    fail("scenario_count", label, String(report.scenarios?.length ?? 0));
  }
  const scenarioIds = new Set();
  for (const scenario of report.scenarios) {
    const validated = validateStrictScenario(scenario, label);
    if (scenarioIds.has(validated.id)) fail("duplicate_scenario", label, validated.id);
    scenarioIds.add(validated.id);
  }
  if (
    !Array.isArray(report.screenshots) ||
    report.screenshots.length < MIN_SCENARIOS ||
    report.screenshots.length > MAX_SCREENSHOTS
  ) {
    fail("screenshot_count", label, String(report.screenshots?.length ?? 0));
  }
  const screenshotPaths = new Set();
  for (const screenshot of report.screenshots) {
    if (
      !isPlainRecord(screenshot) ||
      !nonEmptyBoundedString(screenshot.path) ||
      !PNG_PATTERN.test(screenshot.path) ||
      !screenshot.path.startsWith("_docs/_workflows/_smoke/") ||
      typeof screenshot.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(screenshot.sha256)
    ) {
      fail("invalid_screenshot", label, JSON.stringify(screenshot));
    }
    if (screenshotPaths.has(screenshot.path)) fail("duplicate_screenshot", label, screenshot.path);
    screenshotPaths.add(screenshot.path);
  }
  if (!Array.isArray(report.failures) || report.failures.length !== 0) {
    fail("failures", label, JSON.stringify(report.failures ?? []));
  }
  return Object.freeze({
    ...report,
    scenarios: Object.freeze(report.scenarios),
    screenshots: Object.freeze(report.screenshots),
    consoleErrors: Object.freeze(report.consoleErrors),
    failures: Object.freeze(report.failures),
  });
}

export const S3_SMOKE_ASSERTION_KINDS = ASSERTION_KINDS;
export const S3_SMOKE_MIN_SCENARIOS = MIN_SCENARIOS;
export const S3_SMOKE_MAX_SCENARIOS = MAX_SCENARIOS;

// Bounded JSON dispatch schema mirroring validateS3Smoke's required fields.
// Smoke reports carry extra fields (scenarios/screenshots/failures/consoleErrors)
// beyond the generic RESULT_SCHEMA, so agents dispatch against this shape.
const ASSERTION_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["kind", "selector", "expected"],
  properties: {
    kind: { type: "string", enum: [...ASSERTION_KINDS] },
    selector: { type: "string" },
    expected: { type: "string" },
  },
});

const VARIANT_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["name", "assertions"],
  properties: {
    name: { type: "string" },
    assertions: {
      type: "array",
      minItems: 1,
      maxItems: MAX_ASSERTIONS_PER_VARIANT,
      items: ASSERTION_JSON_SCHEMA,
    },
  },
});

const SCENARIO_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["id", "variants"],
  properties: {
    id: { type: "string" },
    variants: {
      type: "array",
      minItems: 1,
      maxItems: MAX_VARIANTS_PER_SCENARIO,
      items: VARIANT_JSON_SCHEMA,
    },
  },
});

const SCREENSHOT_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["path", "sha256"],
  properties: {
    path: { type: "string", pattern: "^_docs/_workflows/_smoke/.*\\.png$" },
    sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
});

export const S3_SMOKE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "scenarios", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean", enum: [true] },
    serverUp: { type: "boolean", enum: [true] },
    scenarios: {
      type: "array",
      minItems: MIN_SCENARIOS,
      maxItems: MAX_SCENARIOS,
      items: SCENARIO_JSON_SCHEMA,
    },
    consoleErrors: { type: "array", maxItems: MAX_CONSOLE_ERRORS },
    screenshots: {
      type: "array",
      minItems: MIN_SCENARIOS,
      maxItems: MAX_SCREENSHOTS,
      items: SCREENSHOT_JSON_SCHEMA,
    },
    failures: { type: "array", maxItems: MAX_CONSOLE_ERRORS },
  },
});
