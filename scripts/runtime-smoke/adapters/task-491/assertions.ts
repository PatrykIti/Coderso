import { isDeepStrictEqual } from "node:util";

import { assertExactKeys, isPlainObject, SmokeError } from "../../contracts";
import { requireManifestableScenarioResults } from "../../visible-evidence";
import type {
  SmokeScenarioResult,
  SmokeScreenshotResult,
  SmokeVisibleAssertionKind,
} from "../types";
import type { PlainJsonObject, PlainJsonValue } from "../../workers/contracts";
import {
  TASK_491_DESCRIPTOR_SHA256,
  TASK_491_SCENARIOS,
  type Task491AssertionDescriptor,
  type Task491ScenarioDescriptor,
} from "./descriptors";
import type { Task491ScreenshotManifest } from "./output-manifest";

export interface Task491AssertionObservation extends PlainJsonObject {
  readonly id: string;
  readonly kind: string;
  readonly target: string;
  readonly property: string;
  readonly observed: PlainJsonValue;
  readonly observedLabel: string;
}

export interface Task491ScenarioObservation extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly descriptorSha256: string;
  readonly installedDigest: string;
  readonly canonicalUrl: string;
  readonly assertions: readonly Task491AssertionObservation[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly failureCodes: readonly string[];
  readonly screenshotPath: string;
  readonly elapsedMs: number;
}

export interface Task491AcceptedObservations {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly observations: readonly Task491ScenarioObservation[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

const SHA256 = /^[a-f0-9]{64}$/u;

function invalid(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function matchExpectation(expected: PlainJsonValue, observed: PlainJsonValue): boolean {
  if (isPlainObject(expected)) {
    const keys = Object.keys(expected);
    if (keys.length === 1 && keys[0] === "$equals") {
      return isDeepStrictEqual(observed, expected.$equals);
    }
    if (keys.length === 1 && keys[0] === "$min") {
      return (
        typeof expected.$min === "number" &&
        typeof observed === "number" &&
        Number.isFinite(observed) &&
        observed >= expected.$min
      );
    }
    if (keys.length === 1 && keys[0] === "$max") {
      return (
        typeof expected.$max === "number" &&
        typeof observed === "number" &&
        Number.isFinite(observed) &&
        observed <= expected.$max
      );
    }
    if (keys.length === 1 && keys[0] === "$nonEmptyString") {
      return (
        expected.$nonEmptyString === true && typeof observed === "string" && observed.length > 0
      );
    }
    if (!isPlainObject(observed)) return false;
    const observedKeys = Object.keys(observed);
    return (
      observedKeys.length === keys.length &&
      keys.every(
        (key) =>
          Object.hasOwn(observed, key) &&
          matchExpectation(expected[key]!, observed[key] as PlainJsonValue)
      )
    );
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(observed) &&
      observed.length === expected.length &&
      expected.every((item, index) => matchExpectation(item, observed[index]!))
    );
  }
  return Object.is(expected, observed);
}

function validateAssertionObservation(
  observation: unknown,
  descriptor: Task491AssertionDescriptor
): Task491AssertionObservation {
  if (!isPlainObject(observation)) invalid("TASK-491 assertion observation is invalid");
  assertExactKeys(
    observation,
    ["id", "kind", "target", "property", "observed", "observedLabel"],
    "TASK-491 assertion observation"
  );
  if (
    observation.id !== descriptor.id ||
    observation.kind !== descriptor.kind ||
    observation.target !== descriptor.target ||
    observation.property !== descriptor.property ||
    typeof observation.observedLabel !== "string" ||
    !matchExpectation(descriptor.expected, observation.observed as PlainJsonValue)
  ) {
    invalid(`TASK-491 material assertion failed: ${descriptor.id}`);
  }
  return observation as unknown as Task491AssertionObservation;
}

export function validateTask491ScenarioObservation(input: {
  readonly value: unknown;
  readonly descriptor: Task491ScenarioDescriptor;
  readonly manifest: Task491ScreenshotManifest;
  readonly installedDigest: string;
}): Task491ScenarioObservation {
  const { value, descriptor, manifest, installedDigest } = input;
  if (!isPlainObject(value)) invalid("TASK-491 scenario observation is invalid");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "scenarioId",
      "descriptorSha256",
      "installedDigest",
      "canonicalUrl",
      "assertions",
      "consoleErrors",
      "pageErrors",
      "failureCodes",
      "screenshotPath",
      "elapsedMs",
    ],
    "TASK-491 scenario observation"
  );
  const screenshot = manifest.entries[descriptor.number - 1];
  if (
    value.schemaVersion !== 1 ||
    value.scenarioId !== descriptor.id ||
    value.descriptorSha256 !== TASK_491_DESCRIPTOR_SHA256 ||
    value.installedDigest !== installedDigest ||
    !SHA256.test(installedDigest) ||
    value.canonicalUrl !== descriptor.url ||
    !Array.isArray(value.assertions) ||
    value.assertions.length !== descriptor.assertions.length ||
    !Array.isArray(value.consoleErrors) ||
    value.consoleErrors.some((item) => typeof item !== "string") ||
    !Array.isArray(value.pageErrors) ||
    value.pageErrors.some((item) => typeof item !== "string") ||
    !Array.isArray(value.failureCodes) ||
    value.failureCodes.some((item) => typeof item !== "string") ||
    value.consoleErrors.length !== 0 ||
    value.pageErrors.length !== 0 ||
    value.failureCodes.length !== 0 ||
    screenshot === undefined ||
    value.screenshotPath !== screenshot.evidencePath ||
    typeof value.elapsedMs !== "number" ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > 10 * 60_000
  ) {
    invalid(`TASK-491 scenario envelope drifted: ${descriptor.id}`);
  }
  value.assertions.forEach((item, index) =>
    validateAssertionObservation(item, descriptor.assertions[index]!)
  );
  return value as unknown as Task491ScenarioObservation;
}

function projectionForScenario(input: {
  readonly observation: Task491ScenarioObservation;
  readonly descriptor: Task491ScenarioDescriptor;
  readonly screenshot: SmokeScreenshotResult;
}): SmokeScenarioResult {
  const { observation, descriptor, screenshot } = input;
  const variantAssertions = observation.assertions.map((item, index) =>
    Object.freeze({
      kind: item.kind as SmokeVisibleAssertionKind,
      target: item.target,
      property: item.property,
      expected: descriptor.assertions[index]?.expectedLabel ?? item.observedLabel,
      actual: item.observedLabel,
      pass: true,
    })
  );
  return Object.freeze({
    id: observation.scenarioId,
    pass: true,
    elapsedMs: observation.elapsedMs,
    title: descriptor.title,
    variants: Object.freeze([
      Object.freeze({
        id: descriptor.variant.id,
        surface: descriptor.variant.surface,
        theme: descriptor.variant.theme,
        viewport: Object.freeze({ ...descriptor.variant.viewport }),
        assertions: Object.freeze(variantAssertions),
        consoleErrors: Object.freeze([]),
      }),
    ]),
    screenshots: Object.freeze([
      Object.freeze({ path: screenshot.path, sha256: screenshot.sha256 }),
    ]),
  });
}

/**
 * Validates the five scenario observations, projects each into the strict
 * manifestable shape, and requires the exact unique global screenshot union
 * through the shared visible-evidence owner. Returns the frozen normalized
 * scenario list plus the raw observations for the adapter projection.
 */
export function validateExactTask491Observations(input: {
  readonly observations: readonly unknown[];
  readonly descriptors?: readonly Task491ScenarioDescriptor[];
  readonly manifest: Task491ScreenshotManifest;
  readonly installedDigest: string;
  readonly screenshots: readonly SmokeScreenshotResult[];
}): Task491AcceptedObservations {
  const descriptors = input.descriptors ?? TASK_491_SCENARIOS;
  if (
    !Array.isArray(input.observations) ||
    input.observations.length !== 5 ||
    descriptors.length !== 5 ||
    input.manifest.entries.length !== 5 ||
    input.screenshots.length !== 5
  ) {
    invalid("TASK-491 scenario cardinality drifted");
  }
  const observations = input.observations.map((value, index) =>
    validateTask491ScenarioObservation({
      value,
      descriptor: descriptors[index]!,
      manifest: input.manifest,
      installedDigest: input.installedDigest,
    })
  );
  const screenshotByPath = new Map(
    input.screenshots.map((screenshot) => [screenshot.path, screenshot])
  );
  const scenarios = observations.map((observation, index) => {
    const screenshot = screenshotByPath.get(observation.screenshotPath);
    if (screenshot === undefined) {
      invalid(`TASK-491 screenshot is absent for ${observation.scenarioId}`);
    }
    return projectionForScenario({
      observation,
      descriptor: descriptors[index]!,
      screenshot: screenshot!,
    });
  });
  const manifestable = requireManifestableScenarioResults(scenarios, input.screenshots);
  return Object.freeze({
    scenarios: manifestable,
    observations: Object.freeze(observations),
    consoleErrors: Object.freeze([]),
    pageErrors: Object.freeze([]),
  });
}

export function assertTask491SafeProjection(
  value: unknown,
  forbiddenValues: readonly string[]
): void {
  const forbidden = [...new Set(forbiddenValues)].filter((item) => item.length > 0);
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  let visited = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    visited += 1;
    if (visited > 100_000) invalid("TASK-491 safe projection exceeds its bound");
    if (typeof current === "string") {
      if (forbidden.some((secret) => current.includes(secret))) {
        invalid("TASK-491 safe projection contains private material");
      }
      continue;
    }
    if (current === null || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    pending.push(...Object.values(current));
  }
}
