// TASK-545 visible evidence: the runner-side entry point for manifest-bearing
// suites. Thin typed delegate over the single schema owner
// (_docs/_workflows/lib/smoke-evidence.mjs); it performs NO projection of its
// own beyond requiring the exact strict manifestable shape and the exact
// unique scenario screenshot union. The adapter recipe requires calling
// requireManifestableScenarioResults(scenarios, globalScreenshots) before
// returning the shared report.

import {
  requireCanonicalByteEquality,
  SmokeEvidenceError,
  uniqueScenarioScreenshotUnion,
  validateStrictManifestableScenario,
  validateStrictScreenshot,
} from "../../_docs/_workflows/lib/smoke-evidence.mjs";
import type {
  ManifestableSmokeScenarioResult,
  SmokeEvidenceScreenshotV1,
} from "../../_docs/_workflows/lib/smoke-evidence.mjs";
import type { SmokeScreenshotResult } from "./adapters/types";

// Strict normalizer for one report scenario. The generic SmokeScenarioResult
// optionally carries title/variants/screenshots for legacy compatibility; a
// manifest-bearing suite must provide all three, every scenario must pass, and
// every nested scalar/array/dimension/byte cap and unknown key fails closed.
export function normalizeStrictManifestableScenario(
  value: unknown
): ManifestableSmokeScenarioResult {
  return validateStrictManifestableScenario(value);
}

// The report's global screenshots array must be byte-equivalent, after
// canonical ordering, to the unique ordered union of scenario-owned
// screenshots. A screenshot belongs to exactly one scenario, so duplicate
// ownership, extra, missing, or reordered entries fail before manifest
// creation.
export function assertExactUniqueScreenshotUnion(
  scenarios: readonly ManifestableSmokeScenarioResult[],
  globalScreenshots: readonly SmokeScreenshotResult[]
): void {
  requireCanonicalByteEquality(
    uniqueScenarioScreenshotUnion(scenarios),
    globalScreenshots.map((shot) => validateStrictScreenshot(shot)),
    "smoke_manifest_report_screenshot_mismatch",
    "screenshots"
  );
}

// Validates that every scenario is manifestable and that the global screenshot
// union is exact, then returns the same frozen normalized scenario list. This
// is the canonical import/call contract every manifest-bearing adapter uses
// directly (or through a named one-line delegate that performs no projection).
export function requireManifestableScenarioResults(
  scenarios: readonly unknown[],
  globalScreenshots: readonly SmokeScreenshotResult[]
): readonly ManifestableSmokeScenarioResult[] {
  if (!Array.isArray(scenarios) || !Array.isArray(globalScreenshots)) {
    throw new SmokeEvidenceError("smoke_report_invalid", "report", "shape");
  }
  const normalized = scenarios.map(normalizeStrictManifestableScenario);
  assertExactUniqueScreenshotUnion(normalized, globalScreenshots);
  return Object.freeze(normalized);
}

// Convenience re-export for adapters that need the ordered union type.
export type { ManifestableSmokeScenarioResult, SmokeEvidenceScreenshotV1 };
