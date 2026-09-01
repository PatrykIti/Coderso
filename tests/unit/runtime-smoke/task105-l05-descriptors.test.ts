import { describe, expect, test } from "bun:test";

import {
  TASK_105_L05_SCENARIO_DESCRIPTORS,
  TASK105_L05_AUTH_FACT_LIMIT,
  assertTerminalTask105L05Report,
  projectTask105L05Receipt,
  projectTask105L05Receipts,
  requireTask105L05Descriptor,
  validateTask105L05BrowserReceipt,
  type Task105L05RequestFact,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/descriptors";

const SCENARIO_IDS = TASK_105_L05_SCENARIO_DESCRIPTORS.map(({ id }) => id);

function fact(endpointId: string, count = 1): Task105L05RequestFact {
  return { endpointId, method: endpointId.startsWith("auth-") ? "GET" : "GET", status: 200, count };
}

function validReceipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    scenarioIds: SCENARIO_IDS,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    bootstrapEpochs: [
      {
        facts: [
          fact("auth-me"),
          fact("auth-install-status"),
          fact("settings-list"),
          fact("custom-screens-list"),
          fact("solution-kits-list"),
        ],
      },
    ],
    semanticFacts: [fact("auth-csrf"), { ...fact("menus-write"), method: "POST" }],
    authFactTotal: 3,
    ...overrides,
  };
}

function terminalReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const facts = {
    "menu-structure-save-publish-parity": {
      surface: "public",
      kind: "dom-state",
      target: "public-navigation",
      property: "fixture-link",
      expected: "true",
      theme: "light",
    },
    "menu-design-appearance-visible-effect": {
      surface: "admin",
      kind: "computed-style",
      target: "menu-navigation",
      property: "font-size",
      expected: "20px",
      theme: "light",
    },
    "dashboard-edit-configure-save": {
      surface: "admin",
      kind: "geometry",
      target: "quick-actions",
      property: "wide-layout",
      expected: "true",
      theme: "dark",
    },
    "dashboard-dirty-remote-stale": {
      surface: "admin",
      kind: "dom-state",
      target: "dashboard-draft",
      property: "stale-draft",
      expected: "true",
      theme: "dark",
    },
    "solution-kit-select-reviewed-handoff": {
      surface: "admin",
      kind: "dom-state",
      target: "reviewed-guide",
      property: "reviewed-prompt",
      expected: "true",
      theme: "dark",
    },
  } as const;
  const scenarios = TASK_105_L05_SCENARIO_DESCRIPTORS.map((descriptor) => {
    const fact = facts[descriptor.id];
    const { theme, surface, ...assertion } = fact;
    const screenshot = {
      path: `screenshots/fast-task105-fast-r1-${String(descriptor.number).padStart(2, "0")}-${descriptor.id}.png`,
      sha256: `${String(descriptor.number).repeat(64)}`,
    };
    return {
      id: descriptor.id,
      pass: true,
      elapsedMs: 0,
      title: descriptor.title,
      variants: [
        {
          id: `${surface}-${theme}`,
          surface,
          theme,
          viewport: descriptor.viewport,
          assertions: [{ ...assertion, actual: fact.expected, pass: true }],
          consoleErrors: [],
        },
      ],
      screenshots: [screenshot],
    };
  });
  return {
    schemaVersion: 1,
    suiteId: "task-105-l05",
    profile: "fast",
    session: "task105-fast-r1",
    pass: true,
    serverUp: true,
    timings: [
      { kind: "suite", name: "task-105-l05", count: 1, failed: 0, elapsedMs: 0 },
      { kind: "cleanup", name: "all", count: 1, failed: 0, elapsedMs: 0 },
    ],
    processes: { "task105l05-worker-db": 1, "task-105-l05-dev-host": 1 },
    snapshots: 2,
    scenarios,
    screenshots: scenarios.map(({ screenshots }) => screenshots[0]),
    consoleErrors: [],
    suiteCleanup: {
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
      receiptDigest: "a".repeat(64),
      receiptConsoleErrors: 0,
      receiptPageErrors: 0,
    },
    cleanup: { pass: true, failures: [] },
    failures: [],
    ...overrides,
  };
}

describe("TASK-105 L05 browser receipt validator", () => {
  test("accepts a bounded redacted receipt", () => {
    const receipt = validateTask105L05BrowserReceipt(validReceipt());
    expect(receipt.authFactTotal).toBe(3);
    expect(receipt.consoleErrorCount).toBe(0);
  });

  test("rejects unknown fields", () => {
    expect(() => validateTask105L05BrowserReceipt(validReceipt({ extra: 1 }))).toThrow();
  });

  test("rejects non-zero console or page errors", () => {
    expect(() =>
      validateTask105L05BrowserReceipt(validReceipt({ consoleErrorCount: 1 }))
    ).toThrow();
    expect(() => validateTask105L05BrowserReceipt(validReceipt({ pageErrorCount: 2 }))).toThrow();
  });

  test("rejects an auth-fact total above the fast-run budget", () => {
    const facts = Array.from({ length: TASK105_L05_AUTH_FACT_LIMIT + 1 }, () => fact("auth-me"));
    // Collapse duplicates into counts to mirror real projection semantics.
    const inflated = validReceipt({
      bootstrapEpochs: [
        {
          facts: [
            fact("auth-me"),
            fact("auth-install-status"),
            fact("settings-list"),
            fact("custom-screens-list"),
            fact("solution-kits-list"),
          ],
        },
      ],
      semanticFacts: [
        { ...fact("auth-csrf"), count: 9 },
        { ...fact("menus-write"), method: "POST" },
      ],
      authFactTotal: 14,
    });
    void facts;
    expect(() => validateTask105L05BrowserReceipt(inflated)).toThrow();
  });

  test("rejects unclassified endpoints and failed statuses", () => {
    expect(() =>
      validateTask105L05BrowserReceipt(validReceipt({ semanticFacts: [fact("unknown-endpoint")] }))
    ).toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [{ endpointId: "menus-read", method: "GET", status: 500, count: 1 }],
        })
      )
    ).toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "dashboard-layout-read", method: "GET", status: 204, count: 1 },
          ],
        })
      )
    ).toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "settings-write", method: "DELETE", status: 200, count: 1 },
          ],
        })
      )
    ).toThrow();
  });

  test("admits only the concrete dashboard preview and solution-kit read contracts", () => {
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "dashboard-layout-write", method: "POST", status: 200, count: 1 },
            { endpointId: "solution-kits-read", method: "GET", status: 200, count: 1 },
            { endpointId: "solution-kits-runs-read", method: "GET", status: 200, count: 1 },
            { endpointId: "public-popups-read", method: "GET", status: 200, count: 1 },
          ],
          authFactTotal: 2,
        })
      )
    ).not.toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "solution-kits-read", method: "POST", status: 200, count: 1 },
          ],
        })
      )
    ).toThrow();
  });

  test("admits the dashboard widget-data read only as an exact GET 200", () => {
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "dashboard-widget-data-read", method: "GET", status: 200, count: 1 },
            { endpointId: "content-types-read", method: "GET", status: 200, count: 1 },
          ],
          authFactTotal: 2,
        })
      )
    ).not.toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "dashboard-widget-data-read", method: "POST", status: 200, count: 1 },
          ],
          authFactTotal: 2,
        })
      )
    ).toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "dashboard-widget-data-read", method: "GET", status: 204, count: 1 },
          ],
          authFactTotal: 2,
        })
      )
    ).toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        validReceipt({
          semanticFacts: [
            { endpointId: "content-types-read", method: "POST", status: 200, count: 1 },
          ],
          authFactTotal: 2,
        })
      )
    ).toThrow();
  });

  test("projection returns no console errors and a stable digest", () => {
    const projection = projectTask105L05Receipt(validateTask105L05BrowserReceipt(validReceipt()));
    expect(projection.consoleErrors).toEqual([]);
    expect(projection.requestDigest).toMatch(/^[a-f0-9]{64}$/u);
  });

  test("aggregate projection retains only the zero-count receipt summary", () => {
    const baseEpoch = (validReceipt().bootstrapEpochs as readonly unknown[])[0];
    const pageA = validReceipt({
      bootstrapEpochs: [baseEpoch, baseEpoch],
      semanticFacts: [fact("menus-read")],
      authFactTotal: 4,
    });
    const projection = projectTask105L05Receipts({
      receiptA: pageA,
      receiptB: validReceipt(),
    });
    expect(projection.consoleErrors).toEqual([]);
    expect(projection.consoleErrorCount).toBe(0);
    expect(projection.pageErrorCount).toBe(0);
    expect(projection.requestDigest).toMatch(/^[a-f0-9]{64}$/u);
  });
});

describe("terminal TASK-105 L05 runner-report validator", () => {
  const expected = {
    exitCode: 0,
    suiteId: "task-105-l05" as const,
    profile: "fast" as const,
    session: "task105-fast-r1",
  };

  test("accepts the complete passing envelope", () => {
    expect(() => assertTerminalTask105L05Report(terminalReport(), expected)).not.toThrow();
  });

  test("refuses wrong-suite, wrong-profile, and wrong-session identity", () => {
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ suiteId: "task-547" }), expected)
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ profile: "certification" }), expected)
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ session: "other" }), expected)
    ).toThrow();
  });

  test("refuses malformed envelopes and failed states", () => {
    expect(() => assertTerminalTask105L05Report({}, expected)).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ schemaVersion: 2 }), expected)
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ pass: false }), expected)
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(
        terminalReport({ cleanup: { pass: false, failures: [] } }),
        expected
      )
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ failures: ["x"] }), expected)
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report({ ...terminalReport(), unexpectedKey: 1 }, expected)
    ).toThrow();
  });

  test("refuses incomplete liveness, evidence, and bounded receipt shapes", () => {
    expect(() =>
      assertTerminalTask105L05Report(
        terminalReport({ suiteCleanup: { contract: "task-105-l05-liveness-v1" } }),
        expected
      )
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ consoleErrors: ["error"] }), expected)
    ).toThrow();
    const suiteCleanup = terminalReport().suiteCleanup;
    if (suiteCleanup === null || typeof suiteCleanup !== "object" || Array.isArray(suiteCleanup)) {
      throw new Error("terminal fixture has an invalid suite cleanup shape");
    }
    expect(() =>
      assertTerminalTask105L05Report(
        terminalReport({
          suiteCleanup: { ...suiteCleanup, receiptPageErrors: 1 },
        }),
        expected
      )
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ snapshots: 1 }), expected)
    ).toThrow();
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ timings: [] }), expected)
    ).toThrow();
    const fewerScenarios = (terminalReport().scenarios as readonly unknown[]).slice(1);
    expect(() =>
      assertTerminalTask105L05Report(terminalReport({ scenarios: fewerScenarios }), expected)
    ).toThrow();
    const mismatched = terminalReport();
    const screenshots = [...(mismatched.screenshots as readonly Record<string, unknown>[])];
    screenshots[0] = { ...screenshots[0], sha256: "f".repeat(64) };
    expect(() =>
      assertTerminalTask105L05Report({ ...mismatched, screenshots }, expected)
    ).toThrow();
  });

  test("refuses a non-zero exit expectation", () => {
    expect(() =>
      assertTerminalTask105L05Report(terminalReport(), { ...expected, exitCode: 1 })
    ).toThrow();
  });
});

describe("scenario descriptors", () => {
  test("exposes exactly the five contract scenarios", () => {
    expect(SCENARIO_IDS).toEqual([
      "menu-structure-save-publish-parity",
      "menu-design-appearance-visible-effect",
      "dashboard-edit-configure-save",
      "dashboard-dirty-remote-stale",
      "solution-kit-select-reviewed-handoff",
    ]);
  });

  test("requireTask105L05Descriptor rejects unknown ids", () => {
    expect(() => requireTask105L05Descriptor("nope")).toThrow();
  });
});
