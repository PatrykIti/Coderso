import { expect, test } from "bun:test";
import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isCallExpression,
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isStringLiteral,
  type Node,
} from "typescript";

type LegacyDisposition = "ported-native" | "obsolete-workflow-orchestration";

interface LegacyCoverageEntry {
  readonly legacyFile: string;
  readonly legacyTest: string;
  readonly disposition: LegacyDisposition;
  readonly coverageArea: string;
  readonly replacementTests: readonly string[];
  readonly replacementAssertions: readonly string[];
  readonly rationale: string;
}

interface SupplementalCoverageEntry {
  readonly coverageArea: string;
  readonly replacementTests: readonly string[];
}

interface LegacyCoverageFixture {
  readonly schemaVersion: 1;
  readonly legacyFileCount: number;
  readonly legacyCaseCount: number;
  readonly portedCaseCount: number;
  readonly obsoleteCaseCount: number;
  readonly entries: readonly LegacyCoverageEntry[];
  readonly supplementalNativeCoverage: readonly SupplementalCoverageEntry[];
}

const root = resolve(import.meta.dir, "../../..");
const workflowsRoot = resolve(root, "tests/unit/workflows");
const fixturePath = resolve(root, "tests/fixtures/runtime-smoke/task540-legacy-test-coverage.json");
const LEGACY_FILE = /^task540.*\.test\.ts$/u;
const REPOSITORY_TEST = /^tests\/unit\/runtime-smoke\/[a-z0-9-]+\.test\.ts$/u;
const REQUIRED_NATIVE_AREAS = new Set([
  "scenario-action-screenshot-cardinality",
  "handler-alias-schema-parity",
  "console-page-error-and-visible-output",
  "environment-and-session-rejection",
  "profile-isolation-and-single-db-connection",
  "response-lost-baselines",
  "complete-cleanup-receipts",
]);

function exactKeys(value: object, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  expect(actual, label).toEqual(wanted);
}

function stringArray(value: unknown, label: string): readonly string[] {
  expect(Array.isArray(value), label).toBe(true);
  const output = value as unknown[];
  expect(
    output.every((item) => typeof item === "string" && item.length > 0),
    label
  ).toBe(true);
  return output as readonly string[];
}

function validateFixture(value: unknown): LegacyCoverageFixture {
  expect(value !== null && typeof value === "object" && !Array.isArray(value)).toBe(true);
  const fixture = value as Partial<LegacyCoverageFixture>;
  exactKeys(
    fixture,
    [
      "schemaVersion",
      "legacyFileCount",
      "legacyCaseCount",
      "portedCaseCount",
      "obsoleteCaseCount",
      "entries",
      "supplementalNativeCoverage",
    ],
    "coverage fixture"
  );
  expect(fixture.schemaVersion).toBe(1);
  expect(fixture.legacyFileCount).toBe(13);
  expect(fixture.legacyCaseCount).toBe(55);
  expect(fixture.portedCaseCount).toBe(15);
  expect(fixture.obsoleteCaseCount).toBe(40);
  expect(Array.isArray(fixture.entries)).toBe(true);
  expect(Array.isArray(fixture.supplementalNativeCoverage)).toBe(true);
  return fixture as LegacyCoverageFixture;
}

function testNames(source: string, file: string): readonly string[] {
  const parsed = createSourceFile(file, source, ScriptTarget.Latest, true, ScriptKind.TS);
  const output: string[] = [];
  const visit = (node: Node): void => {
    if (
      isCallExpression(node) &&
      isIdentifier(node.expression) &&
      (node.expression.text === "test" || node.expression.text === "it")
    ) {
      const title = node.arguments[0];
      if (
        title !== undefined &&
        (isStringLiteral(title) || isNoSubstitutionTemplateLiteral(title))
      ) {
        output.push(title.text);
      }
    }
    forEachChild(node, visit);
  };
  visit(parsed);
  return Object.freeze(output);
}

async function regularFile(path: string): Promise<boolean> {
  const metadata = await lstat(path).catch(() => null);
  return metadata?.isFile() === true && !metadata.isSymbolicLink();
}

const fixture = validateFixture(JSON.parse(await readFile(fixturePath, "utf8")) as unknown);

test("TASK-540 legacy workflow tests have an exact reviewed native-or-obsolete disposition", async () => {
  expect(fixture.entries).toHaveLength(fixture.legacyCaseCount);
  const identities = fixture.entries.map(({ legacyFile, legacyTest }) =>
    JSON.stringify([legacyFile, legacyTest])
  );
  expect(new Set(identities).size).toBe(identities.length);
  expect(new Set(fixture.entries.map(({ legacyFile }) => legacyFile)).size).toBe(
    fixture.legacyFileCount
  );
  expect(fixture.entries.filter(({ disposition }) => disposition === "ported-native")).toHaveLength(
    fixture.portedCaseCount
  );
  expect(
    fixture.entries.filter(({ disposition }) => disposition === "obsolete-workflow-orchestration")
  ).toHaveLength(fixture.obsoleteCaseCount);

  for (const entry of fixture.entries) {
    exactKeys(
      entry,
      [
        "legacyFile",
        "legacyTest",
        "disposition",
        "coverageArea",
        "replacementTests",
        "replacementAssertions",
        "rationale",
      ],
      "coverage entry"
    );
    expect(entry.legacyFile).toMatch(/^tests\/unit\/workflows\/task540.*\.test\.ts$/u);
    expect(entry.legacyTest.length).toBeGreaterThan(0);
    expect(entry.coverageArea.length).toBeGreaterThan(0);
    expect(entry.rationale.length).toBeGreaterThan(40);
    stringArray(entry.replacementTests, "replacement tests");
    stringArray(entry.replacementAssertions, "replacement assertions");
    if (entry.disposition === "ported-native") {
      expect(entry.replacementTests.length).toBeGreaterThan(0);
      expect(entry.replacementAssertions.length).toBeGreaterThan(0);
    } else {
      expect(entry.coverageArea).toBe("historical-workflow-orchestration");
      expect(entry.replacementTests).toEqual([]);
      expect(entry.replacementAssertions).toEqual([]);
    }
  }

  const currentLegacyFiles = (await readdir(workflowsRoot)).filter((file) =>
    LEGACY_FILE.test(file)
  );
  expect([0, fixture.legacyFileCount]).toContain(currentLegacyFiles.length);
  if (currentLegacyFiles.length === fixture.legacyFileCount) {
    const currentCases: string[] = [];
    for (const file of currentLegacyFiles.sort()) {
      const source = await readFile(resolve(workflowsRoot, file), "utf8");
      currentCases.push(
        ...testNames(source, file).map((name) =>
          JSON.stringify([`tests/unit/workflows/${file}`, name])
        )
      );
    }
    expect(currentCases.sort()).toEqual([...identities].sort());
  }
});

test("TASK-540 ported coverage names real focused native assertions and all closure areas", async () => {
  const sources = new Map<string, readonly string[]>();
  for (const entry of fixture.entries) {
    for (const replacement of entry.replacementTests) {
      expect(replacement).toMatch(REPOSITORY_TEST);
      if (!sources.has(replacement)) {
        const absolute = resolve(root, replacement);
        expect(await regularFile(absolute)).toBe(true);
        sources.set(replacement, testNames(await readFile(absolute, "utf8"), replacement));
      }
    }
    for (const assertion of entry.replacementAssertions) {
      expect(
        entry.replacementTests.some((replacement) => sources.get(replacement)?.includes(assertion))
      ).toBe(true);
    }
  }

  const supplementalAreas = new Set<string>();
  for (const entry of fixture.supplementalNativeCoverage) {
    exactKeys(entry, ["coverageArea", "replacementTests"], "supplemental coverage entry");
    expect(REQUIRED_NATIVE_AREAS.has(entry.coverageArea)).toBe(true);
    expect(supplementalAreas.has(entry.coverageArea)).toBe(false);
    supplementalAreas.add(entry.coverageArea);
    expect(
      stringArray(entry.replacementTests, "supplemental replacement tests").length
    ).toBeGreaterThan(0);
    for (const replacement of entry.replacementTests) {
      expect(replacement).toMatch(REPOSITORY_TEST);
      expect(await regularFile(resolve(root, replacement))).toBe(true);
    }
  }
  expect(supplementalAreas).toEqual(REQUIRED_NATIVE_AREAS);
});
