import { isDeepStrictEqual } from "node:util";

import { assertExactKeys, isPlainObject, SmokeError } from "../../contracts";
import type { SmokeScenarioResult } from "../types";
import type { PlainJsonObject, PlainJsonValue } from "../../workers/contracts";
import {
  TASK_547_DESCRIPTOR_SHA256,
  TASK_547_SCENARIOS,
  type Task547AssertionDescriptor,
  type Task547ScenarioDescriptor,
} from "./descriptors";
import type { Task547ScreenshotManifest } from "./output-manifest";

export interface Task547AssertionObservation extends PlainJsonObject {
  readonly id: string;
  readonly kind: string;
  readonly target: string;
  readonly observed: PlainJsonValue;
}

export interface Task547ScenarioObservation extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly descriptorSha256: string;
  readonly installedDigest: string;
  readonly canonicalUrl: PlainJsonValue;
  readonly assertions: readonly Task547AssertionObservation[];
  readonly submissionIds: readonly string[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly failureCodes: readonly string[];
  readonly screenshotPath: string;
  readonly elapsedMs: number;
}

export interface Task547AcceptedObservations {
  readonly scenarios: readonly SmokeScenarioResult[];
  readonly observations: readonly Task547ScenarioObservation[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
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
  descriptor: Task547AssertionDescriptor
): Task547AssertionObservation {
  if (!isPlainObject(observation)) invalid("TASK-547 assertion observation is invalid");
  assertExactKeys(
    observation,
    ["id", "kind", "target", "observed"],
    "TASK-547 assertion observation"
  );
  if (
    observation.id !== descriptor.id ||
    observation.kind !== descriptor.kind ||
    observation.target !== descriptor.target ||
    !matchExpectation(descriptor.expected, observation.observed as PlainJsonValue)
  ) {
    invalid(`TASK-547 material assertion failed: ${descriptor.id}`);
  }
  return observation as unknown as Task547AssertionObservation;
}

function expectedSubmissionCount(scenarioId: string): number {
  if (scenarioId === "contact-form") return 3;
  if (
    scenarioId === "form-design-publish-front" ||
    scenarioId === "page-editor-publish-front-parity"
  ) {
    return 1;
  }
  return 0;
}

function canonicalDescriptorUrl(descriptor: Task547ScenarioDescriptor): PlainJsonValue {
  return Array.isArray(descriptor.url) ? [...descriptor.url] : descriptor.url;
}

export function validateTask547ScenarioObservation(input: {
  readonly value: unknown;
  readonly descriptor: Task547ScenarioDescriptor;
  readonly manifest: Task547ScreenshotManifest;
  readonly installedDigest: string;
}): Task547ScenarioObservation {
  const { value, descriptor, manifest, installedDigest } = input;
  if (!isPlainObject(value)) invalid("TASK-547 scenario observation is invalid");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "scenarioId",
      "descriptorSha256",
      "installedDigest",
      "canonicalUrl",
      "assertions",
      "submissionIds",
      "consoleErrors",
      "pageErrors",
      "failureCodes",
      "screenshotPath",
      "elapsedMs",
    ],
    "TASK-547 scenario observation"
  );
  const screenshot = input.manifest.entries[descriptor.number - 1];
  if (
    value.schemaVersion !== 1 ||
    value.scenarioId !== descriptor.id ||
    value.descriptorSha256 !== TASK_547_DESCRIPTOR_SHA256 ||
    value.installedDigest !== installedDigest ||
    !SHA256.test(installedDigest) ||
    !isDeepStrictEqual(value.canonicalUrl, canonicalDescriptorUrl(descriptor)) ||
    !Array.isArray(value.assertions) ||
    value.assertions.length !== descriptor.assertions.length ||
    !Array.isArray(value.submissionIds) ||
    value.submissionIds.length !== expectedSubmissionCount(descriptor.id) ||
    value.submissionIds.some((id) => typeof id !== "string" || !UUID.test(id)) ||
    new Set(value.submissionIds).size !== value.submissionIds.length ||
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
    value.screenshotPath !== screenshot.path ||
    typeof value.elapsedMs !== "number" ||
    !Number.isFinite(value.elapsedMs) ||
    value.elapsedMs < 0 ||
    value.elapsedMs > 10 * 60_000
  ) {
    invalid(`TASK-547 scenario envelope drifted: ${descriptor.id}`);
  }
  value.assertions.forEach((item, index) =>
    validateAssertionObservation(item, descriptor.assertions[index]!)
  );
  return value as unknown as Task547ScenarioObservation;
}

export function validateExactTask547Observations(input: {
  readonly observations: readonly unknown[];
  readonly descriptors?: readonly Task547ScenarioDescriptor[];
  readonly manifest: Task547ScreenshotManifest;
  readonly installedDigest: string;
}): Task547AcceptedObservations {
  const descriptors = input.descriptors ?? TASK_547_SCENARIOS;
  if (
    !Array.isArray(input.observations) ||
    input.observations.length !== 18 ||
    descriptors.length !== 18 ||
    input.manifest.entries.length !== 18
  ) {
    invalid("TASK-547 scenario cardinality drifted");
  }
  const observations = input.observations.map((value, index) =>
    validateTask547ScenarioObservation({
      value,
      descriptor: descriptors[index]!,
      manifest: input.manifest,
      installedDigest: input.installedDigest,
    })
  );
  const scenarios = observations.map(({ scenarioId: id, elapsedMs }) =>
    Object.freeze({ id, pass: true, elapsedMs })
  );
  return Object.freeze({
    scenarios: Object.freeze(scenarios),
    observations: Object.freeze(observations),
    consoleErrors: Object.freeze([]),
    pageErrors: Object.freeze([]),
  });
}

export function assertTask547SafeProjection(
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
    if (visited > 100_000) invalid("TASK-547 safe projection exceeds its bound");
    if (typeof current === "string") {
      if (forbidden.some((secret) => current.includes(secret))) {
        invalid("TASK-547 safe projection contains private material");
      }
      continue;
    }
    if (current === null || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    pending.push(...Object.values(current));
  }
}

export function task547AssertionIds(descriptor: Task547ScenarioDescriptor): readonly string[] {
  return Object.freeze(descriptor.assertions.map(({ id }) => id));
}
