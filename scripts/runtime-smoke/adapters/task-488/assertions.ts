import { SmokeError } from "../../contracts";
import type {
  SmokeScenarioResult,
  SmokeScreenshotResult,
  SmokeVisibleAssertionResult,
} from "../types";
import type { PlainJsonObject } from "../../workers/contracts";
import {
  TASK_488_DESCRIPTOR_SHA256,
  task488ScenarioDescriptors,
  type Task488AssertionDescriptor,
  type Task488ScenarioDescriptor,
} from "./descriptors";
import type { Task488ScreenshotManifest } from "./output-manifest";
import { task488ScreenshotPathFor } from "./output-manifest";

/**
 * TASK-488 observation contract. Every browser segment returns a strict
 * envelope that is validated against the fixed descriptor set, the run fixture
 * digest, and the screenshot manifest. The adapter then projects validated
 * observations into manifestable scenario results (title, admin light+dark
 * variants, exact screenshot union) for `requireManifestableScenarioResults`.
 */

export interface Task488AssertionObservation extends PlainJsonObject {
  readonly id: string;
  readonly kind: string;
  readonly target: string;
  readonly property: string;
  readonly expected: string;
  readonly observed: string | null;
}

export interface Task488ScenarioObservation extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly variantId: "light" | "dark";
  readonly descriptorSha256: string;
  readonly fixtureDigest: string;
  readonly assertions: readonly Task488AssertionObservation[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  readonly failureCodes: readonly string[];
  readonly screenshotPath: string;
  readonly elapsedMs: number;
}

export interface Task488AcceptedObservations {
  readonly observations: readonly Task488ScenarioObservation[];
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
}

const SHA256 = /^[a-f0-9]{64}$/u;

function invalid(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    actual.every((key) => keys.includes(key)) &&
    keys.every((key) => actual.includes(key))
  );
}

function validateAssertionObservation(
  observation: unknown,
  descriptor: Task488AssertionDescriptor
): Task488AssertionObservation {
  if (
    observation === null ||
    typeof observation !== "object" ||
    Array.isArray(observation) ||
    Object.getPrototypeOf(observation) !== Object.prototype
  ) {
    invalid("TASK-488 assertion observation is invalid");
  }
  const candidate = observation as Record<string, unknown>;
  if (
    !hasExactKeys(candidate, ["id", "kind", "target", "property", "expected", "observed"]) ||
    candidate.id !== descriptor.id ||
    candidate.kind !== descriptor.kind ||
    candidate.target !== descriptor.target ||
    candidate.property !== descriptor.property ||
    candidate.expected !== descriptor.expected ||
    (typeof candidate.observed !== "string" && candidate.observed !== null) ||
    (typeof candidate.observed === "string" && candidate.observed !== descriptor.expected)
  ) {
    invalid(`TASK-488 material assertion failed: ${descriptor.id}`);
  }
  return Object.freeze({
    id: candidate.id as string,
    kind: candidate.kind as string,
    target: candidate.target as string,
    property: candidate.property as string,
    expected: candidate.expected as string,
    observed: candidate.observed as string | null,
  });
}

export function validateTask488ScenarioObservation(input: {
  readonly value: unknown;
  readonly descriptor: Task488ScenarioDescriptor;
  readonly variantId: "light" | "dark";
  readonly fixtureDigest: string;
  readonly manifest: Task488ScreenshotManifest;
}): Task488ScenarioObservation {
  const { value, descriptor, variantId, fixtureDigest, manifest } = input;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    invalid("TASK-488 scenario observation is invalid");
  }
  const candidate = value as Record<string, unknown>;
  const descriptorAssertions = descriptor.variants.find(({ id }) => id === variantId)?.assertions;
  if (descriptorAssertions === undefined) {
    invalid("TASK-488 variant descriptor is absent");
  }
  const expectedKeys = [
    "schemaVersion",
    "scenarioId",
    "variantId",
    "descriptorSha256",
    "fixtureDigest",
    "assertions",
    "consoleErrors",
    "pageErrors",
    "failureCodes",
    "screenshotPath",
    "elapsedMs",
  ];
  const expectedScreenshotPath = task488ScreenshotPathFor(manifest, descriptor.id, variantId);
  if (
    !hasExactKeys(candidate, expectedKeys) ||
    candidate.schemaVersion !== 1 ||
    candidate.scenarioId !== descriptor.id ||
    candidate.variantId !== variantId ||
    candidate.descriptorSha256 !== TASK_488_DESCRIPTOR_SHA256 ||
    !SHA256.test(fixtureDigest) ||
    candidate.fixtureDigest !== fixtureDigest ||
    !Array.isArray(candidate.assertions) ||
    candidate.assertions.length !== descriptorAssertions.length ||
    !Array.isArray(candidate.consoleErrors) ||
    candidate.consoleErrors.some((item) => typeof item !== "string") ||
    !Array.isArray(candidate.pageErrors) ||
    candidate.pageErrors.some((item) => typeof item !== "string") ||
    !Array.isArray(candidate.failureCodes) ||
    candidate.failureCodes.some((item) => typeof item !== "string") ||
    candidate.consoleErrors.length !== 0 ||
    candidate.pageErrors.length !== 0 ||
    candidate.failureCodes.length !== 0 ||
    typeof candidate.screenshotPath !== "string" ||
    candidate.screenshotPath.includes("\0") ||
    !candidate.screenshotPath.endsWith(expectedScreenshotPath) ||
    typeof candidate.elapsedMs !== "number" ||
    !Number.isFinite(candidate.elapsedMs) ||
    candidate.elapsedMs < 0 ||
    candidate.elapsedMs > 10 * 60_000
  ) {
    invalid(`TASK-488 scenario envelope drifted: ${descriptor.id}-${variantId}`);
  }
  const assertions = (candidate.assertions as unknown[]).map((item, index) =>
    validateAssertionObservation(item, descriptorAssertions[index]!)
  );
  return Object.freeze({
    schemaVersion: 1 as const,
    scenarioId: candidate.scenarioId as string,
    variantId,
    descriptorSha256: candidate.descriptorSha256 as string,
    fixtureDigest: candidate.fixtureDigest as string,
    assertions: Object.freeze(assertions),
    consoleErrors: Object.freeze(candidate.consoleErrors as string[]),
    pageErrors: Object.freeze(candidate.pageErrors as string[]),
    failureCodes: Object.freeze(candidate.failureCodes as string[]),
    screenshotPath: candidate.screenshotPath as string,
    elapsedMs: candidate.elapsedMs as number,
  });
}

export function validateExactTask488Observations(input: {
  readonly observations: readonly unknown[];
  readonly manifest: Task488ScreenshotManifest;
  readonly fixtureDigest: string;
}): Task488AcceptedObservations {
  if (
    !Array.isArray(input.observations) ||
    input.observations.length !== 10 ||
    input.manifest.entries.length !== 10
  ) {
    invalid("TASK-488 scenario cardinality drifted");
  }
  const variantOrder = ["light", "dark"] as const;
  const observations = input.observations.map((value, index) => {
    const entry = input.manifest.entries[index];
    if (entry === undefined) invalid("TASK-488 manifest row is absent");
    const variantId = variantOrder[index % 2] ?? "light";
    return validateTask488ScenarioObservation({
      value,
      descriptor: task488DescriptorById(entry.scenarioId),
      variantId,
      fixtureDigest: input.fixtureDigest,
      manifest: input.manifest,
    });
  });
  return Object.freeze({
    observations: Object.freeze(observations),
    consoleErrors: Object.freeze([]),
    pageErrors: Object.freeze([]),
  });
}

function task488DescriptorById(scenarioId: string): Task488ScenarioDescriptor {
  const descriptor = task488ScenarioDescriptors().find(({ id }) => id === scenarioId);
  if (descriptor === undefined) invalid("TASK-488 descriptor is absent");
  return descriptor;
}

export function projectTask488ScenarioResults(
  observations: readonly Task488ScenarioObservation[],
  screenshotResults: readonly SmokeScreenshotResult[]
): readonly SmokeScenarioResult[] {
  const shotByPath = new Map(screenshotResults.map((shot) => [shot.path, shot]));
  if (shotByPath.size !== screenshotResults.length) {
    invalid("TASK-488 screenshot results are duplicated");
  }
  const parts = new Map<
    string,
    {
      readonly elapsedMs: number;
      variants: SmokeScenarioResult["variants"];
      screenshots: SmokeScenarioResult["screenshots"];
    }
  >();
  for (const observation of observations) {
    const variant = observation.variantId;
    const screenshot = shotByPath.get(observation.screenshotPath);
    if (screenshot === undefined) invalid("TASK-488 screenshot result is absent");
    const assertionResults: readonly SmokeVisibleAssertionResult[] = Object.freeze(
      observation.assertions.map((item) =>
        Object.freeze({
          kind: item.kind as SmokeVisibleAssertionResult["kind"],
          target: item.target,
          property: item.property,
          expected: item.expected,
          actual: item.observed ?? "",
          pass: item.observed === item.expected,
        })
      )
    );
    const variantResult = Object.freeze({
      id: variant,
      surface: "admin" as const,
      theme: variant,
      viewport: Object.freeze({ width: 1440, height: 1000 }),
      assertions: assertionResults,
      consoleErrors: Object.freeze([]),
    });
    const existing = parts.get(observation.scenarioId);
    if (existing === undefined) {
      parts.set(observation.scenarioId, {
        elapsedMs: observation.elapsedMs,
        variants: [variantResult],
        screenshots: [screenshot],
      });
    } else {
      existing.variants = [...(existing.variants ?? []), variantResult];
      existing.screenshots = [...(existing.screenshots ?? []), screenshot];
    }
  }
  const scenarios: SmokeScenarioResult[] = [];
  for (const [scenarioId, part] of parts) {
    scenarios.push(
      Object.freeze({
        id: scenarioId,
        pass: true,
        elapsedMs: part.elapsedMs,
        title: task488ScenarioTitle(scenarioId),
        variants: Object.freeze(part.variants ?? []),
        screenshots: Object.freeze(part.screenshots ?? []),
      })
    );
  }
  if (
    scenarios.length !== 5 ||
    scenarios.some(
      ({ variants, screenshots }) => variants?.length !== 2 || screenshots?.length !== 2
    )
  ) {
    invalid("TASK-488 scenario projection is incomplete");
  }
  return Object.freeze(scenarios);
}

function task488ScenarioTitle(scenarioId: string): string {
  const titles: Readonly<Record<string, string>> = {
    "commerce-login": "Admin login and authenticated shell",
    "commerce-collections-route": "Commerce list to collections route",
    "collection-create": "Create collection visible and assignable",
    "variant-editor": "Variant editor card authoring",
    "commerce-dark-parity": "Dark theme parity across commerce surfaces",
  };
  const title = titles[scenarioId];
  if (title === undefined) invalid("TASK-488 scenario title is absent");
  return title;
}
