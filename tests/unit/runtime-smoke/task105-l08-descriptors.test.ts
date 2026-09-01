import { describe, expect, test } from "bun:test";

import {
  TASK_105_L08_SCENARIO_DESCRIPTORS,
  TASK105_L08_SCENARIOS,
  TASK_105_L08_SCENARIO_FACTS,
  TASK_105_L08_SCENARIO_SURFACES,
  assertTerminalTask105L08Report,
  createTask105L08CleanupAttestation,
  projectTask105L08Receipt,
  requireTask105L08Descriptor,
  task105L08FactsFor,
  validateTask105L08BrowserReceipt,
} from "../../../scripts/runtime-smoke/adapters/task-105-l08/descriptors";

const SCENARIO_IDS = TASK_105_L08_SCENARIO_DESCRIPTORS.map(({ id }) => id);
const CONTRACT_FACTS = task105L08FactsFor(TASK105_L08_SCENARIOS[0]);

function fact(index: number): Record<string, unknown> {
  const contract = CONTRACT_FACTS[index];
  if (contract === undefined) throw new Error("missing contract fact");
  return {
    kind: contract.kind,
    target: contract.target,
    property: contract.property,
    expected: contract.expected ?? "16px",
    actual: contract.expected ?? "16px",
    pass: true,
  };
}

function scenarioFacts(scenarioId: string): Record<string, unknown>[] {
  const id = requireTask105L08Descriptor(scenarioId).id;
  return task105L08FactsFor(id).map((contract, index) => {
    const value = contract.expected ?? "128px";
    void index;
    return {
      kind: contract.kind,
      target: contract.target,
      property: contract.property,
      expected: value,
      actual: value,
      pass: true,
    };
  });
}

function validScenario(scenarioId: string): Record<string, unknown> {
  const descriptor = requireTask105L08Descriptor(scenarioId);
  const theme = descriptor.themes[0] ?? "light";
  return {
    scenarioId,
    theme,
    surface: TASK_105_L08_SCENARIO_SURFACES[descriptor.id],
    viewport: { width: descriptor.viewport.width, height: descriptor.viewport.height },
    facts: scenarioFacts(scenarioId),
  };
}

function validReceipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    scenarioIds: SCENARIO_IDS,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    scenarios: SCENARIO_IDS.map((id) => validScenario(id)),
    ...overrides,
  };
}

function screenshot(path: string): Record<string, unknown> {
  return { path, sha256: "a".repeat(64) };
}

function terminalReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const scenarios = SCENARIO_IDS.map((id, index) => {
    const descriptor = requireTask105L08Descriptor(id);
    const theme = descriptor.themes[0] ?? "light";
    return {
      id,
      pass: true,
      elapsedMs: 12,
      title: descriptor.title,
      variants: [
        {
          id: `${TASK_105_L08_SCENARIO_SURFACES[descriptor.id]}-${theme}`,
          surface: TASK_105_L08_SCENARIO_SURFACES[descriptor.id],
          theme,
          viewport: { width: descriptor.viewport.width, height: descriptor.viewport.height },
          assertions: scenarioFacts(id),
          consoleErrors: [],
        },
      ],
      screenshots: [
        screenshot(
          `screenshots/fast-task105l08-fast-${String(index + 1).padStart(2, "0")}-${id}.png`
        ),
      ],
    };
  });
  return {
    schemaVersion: 1,
    suiteId: "task-105-l08",
    profile: "fast",
    session: "task105l08-fast",
    pass: true,
    serverUp: true,
    timings: [
      { kind: "suite", name: "task-105-l08", count: 1, failed: 0, elapsedMs: 1000 },
      { kind: "cleanup", name: "all", count: 1, failed: 0, elapsedMs: 10 },
    ],
    processes: {
      "task-105-l08-dev-host": 1,
      "playwright-open": 1,
    },
    snapshots: 2,
    scenarios,
    screenshots: scenarios.flatMap((scenario) => scenario.screenshots as unknown[]),
    consoleErrors: [],
    suiteCleanup: createTask105L08CleanupAttestation("b".repeat(64)),
    cleanup: { pass: true, failures: [] },
    failures: [],
    ...overrides,
  };
}

describe("TASK-105 L08 descriptors", () => {
  test("freezes the exact contract scenario identity and order", () => {
    expect([...TASK105_L08_SCENARIOS]).toEqual([
      "page-deep-section-insert-visible-layer",
      "page-device-override-reset-publish-front-parity",
      "post-block-inspector-save-publish-front-parity",
      "post-classic-edit-preview-focus-visible",
      "post-richtext-command-slash-transition-visible",
    ]);
    expect(TASK_105_L08_SCENARIO_DESCRIPTORS.length).toBe(5);
    expect(SCENARIO_IDS).toEqual([...TASK105_L08_SCENARIOS]);
    expect(TASK_105_L08_SCENARIO_FACTS.length).toBeGreaterThanOrEqual(5);
    // Admin light and dark are both covered across page and post flows.
    expect(
      new Set(TASK_105_L08_SCENARIO_DESCRIPTORS.map((descriptor) => descriptor.themes[0]))
    ).toEqual(new Set(["light", "dark"]));
    expect(
      TASK_105_L08_SCENARIO_DESCRIPTORS.filter(
        (descriptor) => TASK_105_L08_SCENARIO_SURFACES[descriptor.id] === "admin"
      ).length
    ).toBe(3);
  });

  test("covers every scenario with at least one bounded visible fact", () => {
    for (const id of SCENARIO_IDS) {
      const facts = task105L08FactsFor(id);
      expect(facts.length).toBeGreaterThan(0);
      for (const contract of facts) {
        expect(["computed-style", "geometry", "dom-state"]).toContain(contract.kind);
        expect(contract.target.length).toBeGreaterThan(0);
        expect(contract.property.length).toBeGreaterThan(0);
      }
    }
  });

  test("validates a redacted zero-error receipt and rejects drift", () => {
    expect(validateTask105L08BrowserReceipt(validReceipt()).consoleErrorCount).toBe(0);
    expect(validateTask105L08BrowserReceipt(validReceipt()).scenarios[0]?.facts.length).toBe(
      CONTRACT_FACTS.length
    );

    const invalid: Record<string, unknown>[] = [
      validReceipt({ consoleErrorCount: 1 }),
      validReceipt({ pageErrorCount: 2 }),
      validReceipt({ scenarioIds: [...SCENARIO_IDS].reverse() }),
      validReceipt({ scenarios: SCENARIO_IDS.slice(1).map((id) => validScenario(id)) }),
      validReceipt({ extra: true }),
      validReceipt({ scenarioIds: [...SCENARIO_IDS, "extra-scenario"] }),
    ];
    for (const receipt of invalid) {
      expect(() => validateTask105L08BrowserReceipt(receipt)).toThrow();
    }
    const drifted = validScenario(SCENARIO_IDS[0] as string);
    drifted.facts = [{ ...fact(0), actual: "31px", expected: "31px" }];
    expect(() =>
      validateTask105L08BrowserReceipt(validReceipt({ scenarios: [drifted] }))
    ).toThrow();
    const unproven = validScenario(SCENARIO_IDS[0] as string);
    unproven.facts = [{ ...fact(0), pass: false }];
    expect(() =>
      validateTask105L08BrowserReceipt(validReceipt({ scenarios: [unproven] }))
    ).toThrow();
    const mismatched = validScenario(SCENARIO_IDS[0] as string);
    mismatched.facts = [{ ...fact(0), actual: "false", expected: "false" }];
    expect(() =>
      validateTask105L08BrowserReceipt(validReceipt({ scenarios: [mismatched] }))
    ).toThrow();
  });

  test("projects only a digest and an empty console receipt", () => {
    const projected = projectTask105L08Receipt({ receipt: validReceipt() });
    expect(projected.consoleErrors).toEqual([]);
    expect(projected.receiptDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(projected.receiptDigest).toBe(
      projectTask105L08Receipt({ receipt: validReceipt() }).receiptDigest
    );
    expect(projected.receiptDigest).not.toBe(
      projectTask105L08Receipt({
        receipt: validReceipt({
          scenarios: SCENARIO_IDS.map((id, index) => ({
            ...validScenario(id),
            // Scenario 2 contracts a px parity scalar; a different parity value
            // is still valid evidence but must change the projection digest.
            facts:
              index === 1
                ? scenarioFacts(id).map((entry) => ({
                    ...entry,
                    expected: "130px",
                    actual: "130px",
                  }))
                : scenarioFacts(id),
          })),
        }),
      }).receiptDigest
    );
    expect(() =>
      projectTask105L08Receipt({ receipt: validReceipt({ pageErrorCount: 1 }) })
    ).toThrow();
  });

  test("attestation is a closed registration receipt", () => {
    const attestation = createTask105L08CleanupAttestation("c".repeat(64));
    expect(attestation.contract).toBe("task-105-l08-runtime-v1");
    expect(attestation.cleanupOwner).toBe("shared-lifecycle");
    expect(Object.keys(attestation).sort()).toEqual([
      "browserDispatch",
      "cleanupOwner",
      "contract",
      "devHost",
      "fixtureCleanup",
      "receiptDigest",
      "settingsRestore",
      "workspace",
    ]);
    expect(() => createTask105L08CleanupAttestation("not-a-digest")).toThrow();
  });

  test("accepts exactly the passing terminal report shape", () => {
    expect(() =>
      assertTerminalTask105L08Report(terminalReport(), {
        exitCode: 0,
        suiteId: "task-105-l08",
        profile: "fast",
        session: "task105l08-fast",
      })
    ).not.toThrow();
  });

  test("rejects terminal reports that are not fully passing", () => {
    const base = {
      exitCode: 0,
      suiteId: "task-105-l08",
      profile: "fast",
      session: "task105l08-fast",
    } as const;
    const invalid: Record<string, unknown>[] = [
      terminalReport({ pass: false }),
      terminalReport({ serverUp: false }),
      terminalReport({ exitCodeHint: 1 }),
      terminalReport({ scenarios: [] }),
      terminalReport({ screenshots: [] }),
      terminalReport({ consoleErrors: [" boom"] }),
      terminalReport({ cleanup: { pass: false, failures: [] } }),
      terminalReport({
        suiteCleanup: createTask105L08CleanupAttestation("d".repeat(64)),
        suiteCleanupExtra: true,
      }),
      terminalReport({ failures: [{ code: "smoke_process_failed" }] }),
      terminalReport({ processes: { "playwright-open": 1 } }),
      terminalReport({ snapshots: 0 }),
      terminalReport({ schemaVersion: 2 }),
      terminalReport({ session: "another-session" }),
    ];
    for (const report of invalid) {
      expect(() => assertTerminalTask105L08Report(report, base)).toThrow();
    }
    expect(() =>
      assertTerminalTask105L08Report(terminalReport(), { ...base, exitCode: 1 })
    ).toThrow();
  });
});
