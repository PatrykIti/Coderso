// TASK-545-03-L01 visible-evidence report-side tests (Bun lane). Owns the
// generic shared-runner contract: legacy scenario results without optional
// evidence remain valid for non-manifest suites, manifestable scenarios require
// exact title/nonempty unique variants/visible assertions/scenario screenshots,
// all scalar/array/dimension/byte caps and unknowns fail closed, and the global
// screenshot array equals the unique scenario union.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  SmokeEvidenceError,
  requireManifestEqualsRunnerReport,
  validateSmokeEvidenceManifest,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import type {
  ManifestableSmokeScenarioResult,
  SmokeEvidenceAssertionV1,
  SmokeEvidenceManifestV1,
  SmokeEvidenceScreenshotV1,
  SmokeEvidenceVariantV1,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import {
  assertExactUniqueScreenshotUnion,
  normalizeStrictManifestableScenario,
  requireManifestableScenarioResults,
} from "../../../scripts/runtime-smoke/visible-evidence";

type DeepMutable<T> = { -readonly [K in keyof T]: DeepMutable<T[K]> };
type MutableAssertion = DeepMutable<SmokeEvidenceAssertionV1> & { [key: string]: unknown };
type MutableVariant = DeepMutable<SmokeEvidenceVariantV1> & {
  assertions: MutableAssertion[];
  [key: string]: unknown;
};
type MutableScreenshot = DeepMutable<SmokeEvidenceScreenshotV1> & { [key: string]: unknown };
type MutableScenario = DeepMutable<ManifestableSmokeScenarioResult> & {
  variants: MutableVariant[];
  screenshots: MutableScreenshot[];
  [key: string]: unknown;
};

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

function assertion(overrides: Record<string, unknown> = {}): MutableAssertion {
  return {
    kind: "computed-style",
    target: "sidebar",
    property: "display",
    expected: "flex",
    actual: "flex",
    pass: true,
    ...overrides,
  } as MutableAssertion;
}

function variant(id: string, overrides: Record<string, unknown> = {}): MutableVariant {
  return {
    id,
    surface: "admin",
    theme: "light",
    viewport: { width: 1280, height: 800 },
    assertions: [assertion()],
    consoleErrors: [],
    ...overrides,
  } as MutableVariant;
}

function strictScenario(id: string, overrides: Record<string, unknown> = {}): MutableScenario {
  return {
    id,
    pass: true,
    elapsedMs: 10,
    title: `Title for ${id}`,
    variants: [variant(`${id}-v`)],
    screenshots: [{ path: `${id}.png`, sha256: sha(`${id}.png`) }],
    ...overrides,
  } as MutableScenario;
}

function legacyScenario(id: string, overrides: Record<string, unknown> = {}) {
  return { id, pass: true, elapsedMs: 10, ...overrides };
}

const IDS = ["scenario-one", "scenario-two", "scenario-three", "scenario-four", "scenario-five"];

function strictScenarios(): MutableScenario[] {
  return IDS.map((id) => strictScenario(id));
}

function globalScreenshots(): MutableScreenshot[] {
  return IDS.map((id) => ({ path: `${id}.png`, sha256: sha(`${id}.png`) })) as MutableScreenshot[];
}

function validManifest(): SmokeEvidenceManifestV1 {
  return {
    schemaVersion: 1,
    taskId: "TASK-545",
    suiteId: "task-545",
    profile: "certification",
    session: "task-545-certification",
    report: { path: "report.json", sha256: "0".repeat(64) },
    revision: {
      gitHead: "a".repeat(40),
      workingTreeDirty: false,
      workingTreeSha256: "b".repeat(64),
    },
    generatedAt: "2026-08-13T18:00:00.000Z",
    serverUp: true,
    scenarios: strictScenarios().map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      variants: scenario.variants,
      screenshots: scenario.screenshots,
    })) as SmokeEvidenceManifestV1["scenarios"],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("requireManifestableScenarioResults", () => {
  test("strict manifestable scenarios pass and are frozen", () => {
    const scenarios = strictScenarios();
    const out = requireManifestableScenarioResults(scenarios, globalScreenshots());
    expect(out).toHaveLength(5);
    expect(Object.isFrozen(out)).toBe(true);
  });

  test("legacy scenarios without optional evidence are rejected as manifestable", () => {
    expect(
      errorCode(() => requireManifestableScenarioResults([legacyScenario("scenario-one")], []))
    ).toBe("smoke_schema_invalid");
  });

  test("missing title, variants, assertions, or screenshots fail closed", () => {
    expect(
      errorCode(() =>
        requireManifestableScenarioResults(
          [strictScenario("scenario-one", { title: undefined })],
          globalScreenshots()
        )
      )
    ).toBe("smoke_schema_invalid");
    expect(
      errorCode(() =>
        requireManifestableScenarioResults(
          [strictScenario("scenario-one", { variants: undefined })],
          globalScreenshots()
        )
      )
    ).toBe("smoke_schema_invalid");
    expect(
      errorCode(() =>
        requireManifestableScenarioResults(
          [strictScenario("scenario-one", { screenshots: undefined })],
          globalScreenshots()
        )
      )
    ).toBe("smoke_schema_invalid");
    expect(
      errorCode(() =>
        requireManifestableScenarioResults(
          [strictScenario("scenario-one", { variants: [] })],
          globalScreenshots()
        )
      )
    ).toBe("smoke_schema_invalid");
    expect(
      errorCode(() =>
        requireManifestableScenarioResults(
          [strictScenario("scenario-one", { variants: [variant("v", { assertions: [] })] })],
          globalScreenshots()
        )
      )
    ).toBe("smoke_schema_invalid");
    expect(
      errorCode(() =>
        requireManifestableScenarioResults(
          [strictScenario("scenario-one", { screenshots: [] })],
          globalScreenshots()
        )
      )
    ).toBe("smoke_schema_invalid");
  });

  test("unknown nested keys fail closed", () => {
    const unknownVariant = clone(strictScenario("scenario-one"));
    unknownVariant.variants[0].extra = true;
    expect(
      errorCode(() => requireManifestableScenarioResults([unknownVariant], globalScreenshots()))
    ).toBe("smoke_schema_invalid");
    const unknownAssertion = clone(strictScenario("scenario-one"));
    unknownAssertion.variants[0].assertions[0].extra = true;
    expect(
      errorCode(() => requireManifestableScenarioResults([unknownAssertion], globalScreenshots()))
    ).toBe("smoke_schema_invalid");
    const unknownScreenshot = clone(strictScenario("scenario-one"));
    unknownScreenshot.screenshots[0].extra = true;
    expect(
      errorCode(() => requireManifestableScenarioResults([unknownScreenshot], globalScreenshots()))
    ).toBe("smoke_schema_invalid");
  });

  test("scalar, array, and dimension caps fail closed", () => {
    const tooManyVariants = clone(strictScenario("scenario-one"));
    for (let index = 1; index < 65; index += 1) tooManyVariants.variants.push(variant(`v${index}`));
    expect(
      errorCode(() => requireManifestableScenarioResults([tooManyVariants], globalScreenshots()))
    ).toBe("smoke_schema_invalid");
    const tooManyScreenshots = clone(strictScenario("scenario-one"));
    for (let index = 1; index < 129; index += 1) {
      tooManyScreenshots.screenshots.push({
        path: `extra-${index}.png`,
        sha256: sha(`extra-${index}.png`),
      });
    }
    expect(
      errorCode(() => requireManifestableScenarioResults([tooManyScreenshots], globalScreenshots()))
    ).toBe("smoke_schema_invalid");
    const oversized = clone(strictScenario("scenario-one"));
    oversized.title = "x".repeat(10_001);
    expect(
      errorCode(() => requireManifestableScenarioResults([oversized], globalScreenshots()))
    ).toBe("smoke_schema_invalid");
    const badDimensions = clone(strictScenario("scenario-one"));
    badDimensions.variants[0].viewport = { width: -1, height: 844 };
    expect(
      errorCode(() => requireManifestableScenarioResults([badDimensions], globalScreenshots()))
    ).toBe("smoke_variant_invalid");
  });

  test("false assertions and nonempty console errors fail closed", () => {
    const falseAssertion = clone(strictScenario("scenario-one"));
    falseAssertion.variants[0].assertions[0].pass = false;
    expect(
      errorCode(() => requireManifestableScenarioResults([falseAssertion], globalScreenshots()))
    ).toBe("smoke_assertion_failed");
    const consoleError = clone(strictScenario("scenario-one"));
    consoleError.variants[0].consoleErrors = ["oops"];
    expect(
      errorCode(() => requireManifestableScenarioResults([consoleError], globalScreenshots()))
    ).toBe("smoke_console_errors");
  });
});

describe("assertExactUniqueScreenshotUnion", () => {
  test("exact ordered union passes", () => {
    const scenarios = strictScenarios();
    assertExactUniqueScreenshotUnion(scenarios, globalScreenshots());
  });

  test("extra, missing, reordered, and duplicate-ownership screenshots fail", () => {
    const scenarios = strictScenarios();
    expect(
      errorCode(() =>
        assertExactUniqueScreenshotUnion(scenarios, [
          ...globalScreenshots(),
          { path: "extra.png", sha256: sha("extra.png") },
        ])
      )
    ).toBe("smoke_manifest_report_screenshot_mismatch");
    expect(
      errorCode(() => assertExactUniqueScreenshotUnion(scenarios, globalScreenshots().slice(1)))
    ).toBe("smoke_manifest_report_screenshot_mismatch");
    expect(
      errorCode(() =>
        assertExactUniqueScreenshotUnion(scenarios, [...globalScreenshots()].reverse())
      )
    ).toBe("smoke_manifest_report_screenshot_mismatch");
    const duplicateOwnership = clone(strictScenario("scenario-two"));
    duplicateOwnership.screenshots = clone(strictScenario("scenario-one")).screenshots;
    expect(
      errorCode(() =>
        assertExactUniqueScreenshotUnion(
          [...scenarios.slice(0, 1), duplicateOwnership, ...scenarios.slice(2)],
          globalScreenshots()
        )
      )
    ).toBe("smoke_screenshot_duplicate_ownership");
  });
});

describe("normalizeStrictManifestableScenario", () => {
  test("passes strict scenarios and rejects legacy", () => {
    const out = normalizeStrictManifestableScenario(strictScenario("scenario-one"));
    expect(out.pass).toBe(true);
    expect(out.elapsedMs).toBe(10);
    expect(
      errorCode(() => normalizeStrictManifestableScenario(legacyScenario("scenario-one")))
    ).toBe("smoke_schema_invalid");
    expect(
      errorCode(() =>
        normalizeStrictManifestableScenario(strictScenario("scenario-one", { pass: false }))
      )
    ).toBe("smoke_scenario_not_passed");
  });
});

describe("requireManifestEqualsRunnerReport", () => {
  function report(overrides: Record<string, unknown> = {}) {
    return {
      scenarios: strictScenarios(),
      screenshots: globalScreenshots(),
      ...overrides,
    };
  }

  test("matching manifest and report pass", () => {
    requireManifestEqualsRunnerReport(validManifest(), report());
  });

  test("mutated report evidence fails with the exact mismatch code", () => {
    const cases: [Record<string, unknown>, string][] = [
      [
        report({
          scenarios: strictScenarios().map((s, index) =>
            index === 0 ? { ...s, id: "drifted-id" } : s
          ),
        }),
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        report({
          scenarios: strictScenarios().map((s, index) =>
            index === 0 ? { ...s, title: "Drift" } : s
          ),
        }),
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        report({
          scenarios: strictScenarios().map((s, index) =>
            index === 0 ? { ...s, variants: [variant("v", { theme: "dark" })] } : s
          ),
        }),
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        report({
          scenarios: strictScenarios().map((s, index) =>
            index === 0
              ? { ...s, screenshots: [{ path: "drift.png", sha256: sha("drift.png") }] }
              : s
          ),
        }),
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        report({
          screenshots: [...globalScreenshots(), { path: "extra.png", sha256: sha("extra.png") }],
        }),
        "smoke_manifest_report_screenshot_mismatch",
      ],
    ];
    for (const [mutated, expectedCode] of cases) {
      expect(errorCode(() => requireManifestEqualsRunnerReport(validManifest(), mutated))).toBe(
        expectedCode
      );
    }
  });

  test("a failed report scenario fails", () => {
    expect(
      errorCode(() =>
        requireManifestEqualsRunnerReport(
          validManifest(),
          report({
            scenarios: strictScenarios().map((s, index) =>
              index === 0 ? { ...s, pass: false } : s
            ),
          })
        )
      )
    ).toBe("smoke_scenario_not_passed");
  });

  test("a legacy report without strict evidence fails", () => {
    expect(
      errorCode(() =>
        requireManifestEqualsRunnerReport(
          validManifest(),
          report({ scenarios: [legacyScenario("scenario-one")] })
        )
      )
    ).toBe("smoke_schema_invalid");
  });
});

type MutableReportScenario = {
  id: string;
  pass: boolean;
  elapsedMs: number;
  title: string;
  variants: MutableVariant[];
  screenshots: MutableScreenshot[];
  [key: string]: unknown;
};
type MutableReport = {
  scenarios: MutableReportScenario[];
  screenshots: MutableScreenshot[];
  [key: string]: unknown;
};
type MutableManifestScenario = {
  id: string;
  title: string;
  variants: MutableVariant[];
  screenshots: MutableScreenshot[];
  [key: string]: unknown;
};
type MutableManifest = {
  scenarios: MutableManifestScenario[];
  [key: string]: unknown;
};
type MutationCase = [string, (manifest: MutableManifest, report: MutableReport) => void, string];

describe("cross-suite manifest fixtures", () => {
  const FIXTURES = resolve(import.meta.dir, "../../fixtures/workflows/smoke-evidence");
  const SUITES = ["task-548", "task-414"] as const;

  async function loadSuite(
    suite: string
  ): Promise<{ manifest: SmokeEvidenceManifestV1; report: MutableReport }> {
    const manifest = JSON.parse(
      await readFile(join(FIXTURES, `${suite}-manifest.json`), "utf8")
    ) as SmokeEvidenceManifestV1;
    const report = JSON.parse(
      await readFile(join(FIXTURES, `${suite}-report.json`), "utf8")
    ) as MutableReport;
    return { manifest, report };
  }

  // One mutation per runner-returned evidence facet: scenario id, pass bit,
  // title, variant, assertion expected/actual/pass, console error, screenshot
  // path/hash/order/ownership, on both the report and the manifest side.
  function mutationCases(): MutationCase[] {
    return [
      [
        "report scenario id",
        (_m, r) => {
          r.scenarios[0].id = "drifted-id";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report scenario pass bit",
        (_m, r) => {
          r.scenarios[0].pass = false;
        },
        "smoke_scenario_not_passed",
      ],
      [
        "report scenario title",
        (_m, r) => {
          r.scenarios[0].title = "Drifted title";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report variant",
        (_m, r) => {
          r.scenarios[0].variants[0].theme = "dark";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report assertion expected",
        (_m, r) => {
          r.scenarios[0].variants[0].assertions[0].expected = "block";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report assertion actual",
        (_m, r) => {
          r.scenarios[0].variants[0].assertions[0].actual = "block";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report assertion pass bit",
        (_m, r) => {
          r.scenarios[0].variants[0].assertions[0].pass = false;
        },
        "smoke_assertion_failed",
      ],
      [
        "report console error",
        (_m, r) => {
          r.scenarios[0].variants[0].consoleErrors = ["ops"];
        },
        "smoke_console_errors",
      ],
      [
        "report screenshot path",
        (_m, r) => {
          r.scenarios[0].screenshots[0].path = "drift.png";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report screenshot hash",
        (_m, r) => {
          r.scenarios[0].screenshots[0].sha256 = sha("drift");
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report global screenshot order",
        (_m, r) => {
          r.screenshots.reverse();
        },
        "smoke_manifest_report_screenshot_mismatch",
      ],
      [
        "report screenshot ownership",
        (_m, r) => {
          const first = r.scenarios[0].screenshots[0];
          const second = r.scenarios[1].screenshots[0];
          r.scenarios[0].screenshots[0] = second;
          r.scenarios[1].screenshots[0] = first;
          r.screenshots[0] = second;
          r.screenshots[1] = first;
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "report scenario order",
        (_m, r) => {
          [r.scenarios[0], r.scenarios[1]] = [r.scenarios[1], r.scenarios[0]];
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest scenario id",
        (m, _r) => {
          m.scenarios[0].id = "drifted-id";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest scenario title",
        (m, _r) => {
          m.scenarios[0].title = "Drifted title";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest variant",
        (m, _r) => {
          m.scenarios[0].variants[0].viewport.width = 999;
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest assertion expected",
        (m, _r) => {
          m.scenarios[0].variants[0].assertions[0].expected = "block";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest assertion actual",
        (m, _r) => {
          m.scenarios[0].variants[0].assertions[0].actual = "block";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest assertion pass bit",
        (m, _r) => {
          m.scenarios[0].variants[0].assertions[0].pass = false;
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest console error",
        (m, _r) => {
          m.scenarios[0].variants[0].consoleErrors = ["ops"];
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest screenshot path",
        (m, _r) => {
          m.scenarios[0].screenshots[0].path = "drift.png";
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest screenshot hash",
        (m, _r) => {
          m.scenarios[0].screenshots[0].sha256 = sha("drift");
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest screenshot order",
        (m, _r) => {
          [m.scenarios[0].screenshots[0], m.scenarios[0].screenshots[1]] = [
            m.scenarios[0].screenshots[1],
            m.scenarios[0].screenshots[0],
          ];
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
      [
        "manifest screenshot ownership",
        (m, _r) => {
          const first = m.scenarios[0].screenshots[0];
          const second = m.scenarios[1].screenshots[0];
          m.scenarios[0].screenshots[0] = second;
          m.scenarios[1].screenshots[0] = first;
        },
        "smoke_manifest_report_evidence_mismatch",
      ],
    ];
  }

  for (const suite of SUITES) {
    test(`${suite} manifest validates and matches only its own runner report`, async () => {
      const { manifest, report } = await loadSuite(suite);
      expect(() => validateSmokeEvidenceManifest(manifest)).not.toThrow();
      expect(() => requireManifestEqualsRunnerReport(manifest, report)).not.toThrow();
    });

    test(`${suite} every report/manifest evidence mutation requires mismatch failure`, async () => {
      const { manifest, report } = await loadSuite(suite);
      for (const [label, mutate, expectedCode] of mutationCases()) {
        const manifestClone = clone(manifest) as unknown as MutableManifest;
        const reportClone = clone(report) as MutableReport;
        mutate(manifestClone, reportClone);
        const actual = errorCode(() =>
          requireManifestEqualsRunnerReport(
            manifestClone as unknown as SmokeEvidenceManifestV1,
            reportClone
          )
        );
        if (actual !== expectedCode) {
          throw new Error(`${suite} ${label}: expected ${expectedCode}, got ${actual}`);
        }
      }
    });

    test(`${suite} manifest rejects the other suite's runner report`, async () => {
      const { manifest } = await loadSuite(suite);
      const other = await loadSuite(suite === "task-548" ? "task-414" : "task-548");
      expect(errorCode(() => requireManifestEqualsRunnerReport(manifest, other.report))).toBe(
        "smoke_manifest_report_evidence_mismatch"
      );
    });
  }
});
