// TASK-580-03-L07 runtime smoke suite contracts (detail-page-v2).
// Strict input/output shapes and constants for the detail-page V2 smoke.
// No production code; suite-owned strict validators only.
import { assertExactKeys, isPlainObject, SmokeError } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";

export const DETAIL_PAGE_V2_SUITE_ID = "detail-page-v2" as const;
export const DETAIL_PAGE_V2_PROFILES = Object.freeze(["fast"] as const);

export const DETAIL_PAGE_V2_SCENARIO_IDS = Object.freeze([
  "public-detail-converted",
  "preview-token",
  "editor-roundtrip",
  "legacy-placeholder",
  "assistant-generated",
] as const);

export type DetailPageV2ScenarioId = (typeof DETAIL_PAGE_V2_SCENARIO_IDS)[number];

export const FRONT_URL = "http://127.0.0.1:3000";
export const ADMIN_URL = "http://127.0.0.1:5173/admin";
export const SITE_VITE_URL = "http://127.0.0.1:5174";

export const SMOKE_EVIDENCE_ROOT = "_docs/_workflows/_smoke";
export const MAX_SCREENSHOT_BYTES = 16 * 1024 * 1024;
export const PNG_SIGNATURE = "89504e470d0a1a0a";

export interface DetailPageV2ScenarioResult {
  readonly id: DetailPageV2ScenarioId;
  readonly pass: boolean;
  readonly elapsedMs: number;
  readonly screenshot: SmokeScreenshotResult | null;
  readonly consoleErrors: readonly string[];
  readonly variant: "light" | "dark";
}

export interface DetailPageV2SuiteReport {
  readonly scenarios: readonly DetailPageV2ScenarioResult[];
  readonly screenshots: readonly SmokeScreenshotResult[];
  readonly serverUp: true;
}

export function assertExactDetailPageV2Invocation(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new SmokeError("smoke_argument_invalid", "detail-page-v2 invocation is invalid");
  }
  assertExactKeys(value, ["command", "suite", "profile", "session"], "detail-page-v2 invocation");
  if (
    value.command !== "run" ||
    value.suite !== DETAIL_PAGE_V2_SUITE_ID ||
    (value.profile !== "fast" && value.profile !== "certification") ||
    typeof value.session !== "string"
  ) {
    throw new SmokeError("smoke_argument_invalid", "detail-page-v2 invocation is invalid");
  }
}

export function assertDetailPageV2ScenarioResult(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 scenario result is invalid");
  }
  assertExactKeys(
    value,
    ["id", "pass", "elapsedMs", "screenshot", "consoleErrors", "variant"],
    "detail-page-v2 scenario result"
  );
  if (
    !DETAIL_PAGE_V2_SCENARIO_IDS.includes(value.id as DetailPageV2ScenarioId) ||
    typeof value.pass !== "boolean" ||
    typeof value.elapsedMs !== "number" ||
    !Number.isSafeInteger(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    (value.variant !== "light" && value.variant !== "dark") ||
    !Array.isArray(value.consoleErrors) ||
    value.consoleErrors.some((entry) => typeof entry !== "string")
  ) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 scenario result is invalid");
  }
  const screenshot = value.screenshot as SmokeScreenshotResult | null;
  if (screenshot !== null) {
    if (
      !isPlainObject(screenshot) ||
      typeof screenshot.path !== "string" ||
      typeof screenshot.sha256 !== "string"
    ) {
      throw new SmokeError("smoke_output_invalid", "detail-page-v2 screenshot result is invalid");
    }
  }
}

export function assertDetailPageV2SuiteReport(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 suite report is invalid");
  }
  assertExactKeys(value, ["scenarios", "screenshots", "serverUp"], "detail-page-v2 suite report");
  if (!Array.isArray(value.scenarios) || value.scenarios.length !== 5) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 scenario count is invalid");
  }
  for (const scenario of value.scenarios) assertDetailPageV2ScenarioResult(scenario);
  if (
    !Array.isArray(value.screenshots) ||
    value.screenshots.some((entry) => !isPlainObject(entry)) ||
    value.serverUp !== true
  ) {
    throw new SmokeError("smoke_output_invalid", "detail-page-v2 suite report is invalid");
  }
}
