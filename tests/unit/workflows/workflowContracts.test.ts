import { describe, expect, test } from "bun:test";
import {
  WorkflowResultError,
  collectStructuredFindings,
  highMedium,
  requireAllResults,
} from "../../../_docs/_workflows/lib/workflow-contracts.mjs";
import type {
  WorkflowResultEnvelope,
  WorkflowStructuredFinding,
} from "../../../_docs/_workflows/lib/workflow-contracts.mjs";

// ---------------------------------------------------------------------------
// Shared fixtures and assertion helpers
// ---------------------------------------------------------------------------

const envelope = <T>(identity: string, value: T): WorkflowResultEnvelope<T> => ({
  identity,
  value,
});

// Casts a deliberately malformed entry (null, wrong shape, missing key) into
// the envelope slot so the runtime, not the type system, rejects it.
const rawEntry = (entry: unknown): WorkflowResultEnvelope<unknown> =>
  entry as WorkflowResultEnvelope<unknown>;

// Casts a deliberately non-array container (null, object, string) into the
// results slot so the runtime rejects it as `workflow_results_invalid`.
const rawResults = (container: unknown): WorkflowResultEnvelope<unknown>[] =>
  container as WorkflowResultEnvelope<unknown>[];

const VALID_IDENTITIES = [
  "reconcile",
  "file:src/index.ts",
  "file:docs/develop/runtime-smoke-cookbook.md",
  "file:.github/workflows/ci.yml",
  "lens:scope-fidelity",
  "lens:a",
  "lens:model-fail_closed-2",
];

const finding = (
  severity: WorkflowStructuredFinding["severity"],
  name: string
): WorkflowStructuredFinding => ({
  severity,
  finding: name,
});

// Asserts the full stable error contract: type, name, code, label, and the
// exact `${code}:${label}:${detail}` message with no serialized payload text.
function expectWorkflowError(fn: () => unknown, code: string, label: string, detail: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(WorkflowResultError);
    expect(error).toBeInstanceOf(Error);
    expect((error as WorkflowResultError).name).toBe("WorkflowResultError");
    expect((error as WorkflowResultError).code).toBe(code);
    expect((error as WorkflowResultError).label).toBe(label);
    expect((error as WorkflowResultError).message).toBe(`${code}:${label}:${detail}`);
    return;
  }
  throw new Error(`expected WorkflowResultError ${code}:${label}:${detail}, got no throw`);
}

// ---------------------------------------------------------------------------
// requireAllResults: container and expected-identity validation
// ---------------------------------------------------------------------------

describe("requireAllResults container validation", () => {
  test("rejects a non-array results container with workflow_results_invalid", () => {
    const expected = [VALID_IDENTITIES[0]];
    for (const container of [null, undefined, {}, "results", 42, true]) {
      expectWorkflowError(
        () => requireAllResults(rawResults(container), expected, "audit"),
        "workflow_results_invalid",
        "audit",
        "not_array"
      );
    }
  });
});

describe("requireAllResults expected identity set validation", () => {
  test("rejects non-string, empty, malformed, and non-ASCII expected identities", () => {
    const invalidIdentities: unknown[] = [
      "",
      " ",
      "foo",
      "reconcile2",
      "reconcile:round",
      "file:",
      "lens:",
      "file:/etc/passwd",
      "file:./a.ts",
      "file:../a.ts",
      "file:a/./b",
      "file:a/../b",
      "file:a//b",
      "file:a/",
      "file:a\\b",
      "file:a?b",
      "file:a#b",
      "file:a\u0000b",
      "file:a\u007fb",
      "file:src/\u00e9.ts",
      "lens:FOO",
      "lens:Foo-Bar",
      "lens:foo bar",
      "lens:foo/bar",
      "lens:-foo",
      "lens:foo-",
      "lens:_foo",
      "lens:foo_bar_",
      "lens:\u00f3",
      42,
      null,
      undefined,
      {},
      true,
    ];
    for (const invalid of invalidIdentities) {
      expectWorkflowError(
        () => requireAllResults([], [invalid as string], "audit"),
        "workflow_expected_identities_invalid",
        "audit",
        "identity_set"
      );
    }
  });

  test("rejects an identity longer than 240 ASCII characters", () => {
    expectWorkflowError(
      () => requireAllResults([], [`lens:${"a".repeat(236)}`], "audit"),
      "workflow_expected_identities_invalid",
      "audit",
      "identity_set"
    );
  });

  test("accepts an identity of exactly 240 ASCII characters", () => {
    const results = [envelope(`lens:${"a".repeat(235)}`, { findings: [] })];
    const returned = requireAllResults(results, [`lens:${"a".repeat(235)}`], "audit");
    expect(returned).toBe(results);
  });

  test("rejects duplicate expected identities with workflow_expected_identities_invalid", () => {
    expectWorkflowError(
      () => requireAllResults([], ["file:a.ts", "file:a.ts"], "audit"),
      "workflow_expected_identities_invalid",
      "audit",
      "identity_set"
    );
  });
});

// ---------------------------------------------------------------------------
// requireAllResults: count mismatch
// ---------------------------------------------------------------------------

describe("requireAllResults count mismatch", () => {
  test("rejects a short results array with workflow_result_count_mismatch", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[4], VALID_IDENTITIES[5]];
    const results = [envelope(expected[0], {}), envelope(expected[1], {})];
    expectWorkflowError(
      () => requireAllResults(results, expected, "audit"),
      "workflow_result_count_mismatch",
      "audit",
      "expected=3,actual=2"
    );
  });

  test("rejects a long results array with workflow_result_count_mismatch", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[4]];
    const results = [
      envelope(expected[0], {}),
      envelope(expected[1], {}),
      envelope(VALID_IDENTITIES[5], {}),
    ];
    expectWorkflowError(
      () => requireAllResults(results, expected, "audit"),
      "workflow_result_count_mismatch",
      "audit",
      "expected=2,actual=3"
    );
  });
});

// ---------------------------------------------------------------------------
// requireAllResults: envelope and wrapped-value validation
// ---------------------------------------------------------------------------

describe("requireAllResults envelope validation", () => {
  test("rejects sparse array holes as missing results", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1], VALID_IDENTITIES[2]];
    const sparse = new Array<WorkflowResultEnvelope<unknown>>(3);
    sparse[0] = envelope(expected[0], { findings: [] });
    sparse[2] = envelope(expected[2], { findings: [] });
    expectWorkflowError(
      () => requireAllResults(sparse, expected, "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
  });

  test("rejects null and undefined array entries as missing results", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1], VALID_IDENTITIES[2]];
    const nullEntry = [envelope(expected[0], {}), rawEntry(null), envelope(expected[2], {})];
    const undefinedEntry = [
      envelope(expected[0], {}),
      rawEntry(undefined),
      envelope(expected[2], {}),
    ];
    expectWorkflowError(
      () => requireAllResults(nullEntry, expected, "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
    expectWorkflowError(
      () => requireAllResults(undefinedEntry, expected, "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
  });

  test("rejects an envelope with extra own keys as a missing result", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1]];
    const extraKeys = [
      envelope(expected[0], {}),
      rawEntry({ identity: expected[1], value: {}, extra: 1 }),
    ];
    expectWorkflowError(
      () => requireAllResults(extraKeys, expected, "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
  });

  test("rejects an envelope missing the identity own key as a missing result", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1]];
    const missingKey = [envelope(expected[0], {}), rawEntry({ value: { findings: [] } })];
    expectWorkflowError(
      () => requireAllResults(missingKey, expected, "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
  });

  test("rejects nullish wrapped values as missing results", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1]];
    const nullValue = [envelope(expected[0], {}), envelope(expected[1], null)];
    const undefinedValue = [envelope(expected[0], {}), envelope(expected[1], undefined)];
    expectWorkflowError(
      () => requireAllResults(nullValue, expected, "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
    expectWorkflowError(
      () => requireAllResults(undefinedValue, expected, "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
  });
});

// ---------------------------------------------------------------------------
// requireAllResults: result identity validation
// ---------------------------------------------------------------------------

describe("requireAllResults result identity validation", () => {
  test("rejects an invalid result identity with workflow_result_identity_invalid", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1]];
    const results = [
      envelope(expected[0], {}),
      rawEntry({ identity: "not-a-valid-identity", value: {} }),
    ];
    expectWorkflowError(
      () => requireAllResults(results, expected, "audit"),
      "workflow_result_identity_invalid",
      "audit",
      "index=1"
    );
  });

  test("rejects a wrong result identity with workflow_result_identity_wrong", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1]];
    const results = [envelope(expected[0], {}), envelope("lens:unexpected-key", { findings: [] })];
    expectWorkflowError(
      () => requireAllResults(results, expected, "audit"),
      "workflow_result_identity_wrong",
      "audit",
      "index=1"
    );
  });

  test("rejects duplicate result identities with workflow_result_identity_duplicate", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1]];
    const results = [envelope(expected[0], {}), envelope(expected[0], {})];
    expectWorkflowError(
      () => requireAllResults(results, expected, "audit"),
      "workflow_result_identity_duplicate",
      "audit",
      "index=1"
    );
  });

  test("rejects reordered result identities with workflow_result_identity_reordered", () => {
    const expected = [VALID_IDENTITIES[0], VALID_IDENTITIES[1]];
    const results = [envelope(expected[1], {}), envelope(expected[0], {})];
    expectWorkflowError(
      () => requireAllResults(results, expected, "audit"),
      "workflow_result_identity_reordered",
      "audit",
      "index=0"
    );
  });
});

// ---------------------------------------------------------------------------
// requireAllResults: complete passes
// ---------------------------------------------------------------------------

describe("requireAllResults complete passes", () => {
  test("returns the same array reference for a complete ordered result set", () => {
    const results = [
      envelope(VALID_IDENTITIES[0], { findings: [] }),
      envelope(VALID_IDENTITIES[1], { findings: [] }),
      envelope(VALID_IDENTITIES[2], { findings: [] }),
    ];
    const returned = requireAllResults(results, VALID_IDENTITIES.slice(0, 3), "audit");
    expect(returned).toBe(results);
  });

  test("accepts false, zero, and empty-string payload values as complete", () => {
    const falseyValues = [false, 0, ""];
    for (let index = 0; index < falseyValues.length; index += 1) {
      const results = [envelope(VALID_IDENTITIES[index], falseyValues[index])];
      expect(requireAllResults(results, [VALID_IDENTITIES[index]], "audit")).toBe(results);
    }
  });

  test("accepts an empty job set and returns the same empty array reference", () => {
    const results: WorkflowResultEnvelope<unknown>[] = [];
    expect(requireAllResults(results, [], "audit")).toBe(results);
  });

  test("freezes neither the returned array nor its members", () => {
    const results = [
      envelope(VALID_IDENTITIES[0], { findings: [] }),
      envelope(VALID_IDENTITIES[1], { findings: [] }),
    ];
    const returned = requireAllResults(results, VALID_IDENTITIES.slice(0, 2), "audit");
    expect(Object.isFrozen(returned)).toBe(false);
    expect(Object.isFrozen(returned[0])).toBe(false);
    expect(Object.isFrozen(returned[1])).toBe(false);
    returned.push(envelope(VALID_IDENTITIES[2], { findings: [] }));
    expect(returned.length).toBe(3);
    returned[0].identity = "file:mutated.ts";
    expect(returned[0].identity).toBe("file:mutated.ts");
  });
});

// ---------------------------------------------------------------------------
// requireAllResults: error-message hygiene
// ---------------------------------------------------------------------------

describe("requireAllResults error message hygiene", () => {
  test("never stringifies payload contents or agent-controlled identity text", () => {
    const secretIdentity = "file:agents/id-7f3a9-private";
    const secretPayload = { findings: [{ severity: "HIGH", finding: "SECRET_PAYLOAD_xyz" }] };
    const results = [
      { identity: secretIdentity, value: secretPayload },
      envelope("lens:security", null),
    ];
    expectWorkflowError(
      () => requireAllResults(results, [secretIdentity, "lens:security"], "audit"),
      "workflow_result_missing",
      "audit",
      "index=1"
    );
    try {
      requireAllResults(results, [secretIdentity, "lens:security"], "audit");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(secretIdentity);
      expect(message).not.toContain("agents/id-7f3a9");
      expect(message).not.toContain("SECRET_PAYLOAD_xyz");
      expect(message).not.toContain("lens:security");
    }
  });

  test("wrong-identity errors carry only index metadata, never the identity string", () => {
    const rogueIdentity = "lens:rogue-secret-key";
    try {
      requireAllResults(
        [envelope("file:a.ts", {}), envelope(rogueIdentity, { findings: [] })],
        ["file:a.ts", "file:b.ts"],
        "audit"
      );
    } catch (error) {
      expect((error as WorkflowResultError).code).toBe("workflow_result_identity_wrong");
      expect((error as Error).message).toBe("workflow_result_identity_wrong:audit:index=1");
      expect((error as Error).message).not.toContain(rogueIdentity);
    }
  });
});

// ---------------------------------------------------------------------------
// collectStructuredFindings
// ---------------------------------------------------------------------------

describe("collectStructuredFindings", () => {
  test("rejects a non-array input with workflow_findings_invalid:collect:not_array", () => {
    for (const container of [null, undefined, {}, "values", 42]) {
      expectWorkflowError(
        () => collectStructuredFindings(container as never),
        "workflow_findings_invalid",
        "collect",
        "not_array"
      );
    }
  });

  test("returns an empty list for an empty input", () => {
    expect(collectStructuredFindings([])).toEqual([]);
  });

  test("skips nullish payload entries without dropping their neighbors", () => {
    const first = finding("HIGH", "a");
    const second = finding("LOW", "b");
    const collected = collectStructuredFindings([null, undefined, { findings: [first, second] }]);
    expect(collected).toEqual([first, second]);
    expect(collected[0]).toBe(first);
    expect(collected[1]).toBe(second);
  });

  test("treats a payload without a findings array as empty", () => {
    expect(collectStructuredFindings([{}, { findings: [] }, { findings: undefined }])).toEqual([]);
  });

  test("rejects a missing or unknown severity with workflow_findings_invalid:collect:severity", () => {
    const invalidFindings = [
      [{ severity: "CRITICAL" }],
      [null],
      [undefined],
      [{}],
      [{ severity: "High" }],
      [{ severity: "MEDIUM" }, { severity: "INFO" }],
    ];
    for (const findingsList of invalidFindings) {
      expectWorkflowError(
        () => collectStructuredFindings([{ findings: findingsList }]),
        "workflow_findings_invalid",
        "collect",
        "severity"
      );
    }
  });

  test("never drops or reorders valid findings, including LOW", () => {
    const mixed = [
      finding("LOW", "first"),
      finding("HIGH", "second"),
      finding("MEDIUM", "third"),
      finding("LOW", "fourth"),
    ];
    const collected = collectStructuredFindings([{ findings: mixed }]);
    expect(collected).toEqual(mixed);
    expect(collected.map((item) => item.finding)).toEqual(["first", "second", "third", "fourth"]);
  });

  test("severity errors expose no payload content", () => {
    try {
      collectStructuredFindings([{ findings: [{ severity: "TOPSECRET_LEVEL" }] }]);
    } catch (error) {
      expect((error as WorkflowResultError).code).toBe("workflow_findings_invalid");
      expect((error as Error).message).toBe("workflow_findings_invalid:collect:severity");
      expect((error as Error).message).not.toContain("TOPSECRET_LEVEL");
    }
  });
});

// ---------------------------------------------------------------------------
// highMedium
// ---------------------------------------------------------------------------

describe("highMedium", () => {
  test("filters to HIGH and MEDIUM findings while preserving encounter order", () => {
    const mixed = [
      finding("LOW", "a"),
      finding("HIGH", "b"),
      finding("MEDIUM", "c"),
      finding("LOW", "d"),
      finding("HIGH", "e"),
    ];
    const actionable = highMedium(mixed);
    expect(actionable.map((item) => item.finding)).toEqual(["b", "c", "e"]);
    expect(actionable[0]).toBe(mixed[1]);
    expect(actionable[1]).toBe(mixed[2]);
  });

  test("returns a fresh array and handles empty input", () => {
    const mixed = [finding("HIGH", "a")];
    const actionable = highMedium(mixed);
    expect(actionable).not.toBe(mixed);
    expect(actionable).toEqual([mixed[0]]);
    expect(highMedium([])).toEqual([]);
    expect(highMedium([finding("LOW", "only-low")])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Driver-shaped fail-closed ordering
// ---------------------------------------------------------------------------

describe("driver-shaped fail-closed ordering", () => {
  test("wrapped nullish result throws before normalization or clean classification", () => {
    const results = [envelope("file:a.ts", { findings: [] }), envelope("file:b.ts", null)];
    let normalized = false;
    let classifiedClean = false;
    try {
      const validated = requireAllResults(results, ["file:a.ts", "file:b.ts"], "audit");
      collectStructuredFindings(validated.map((result) => result.value));
      normalized = true;
      classifiedClean = true;
    } catch (error) {
      expect((error as WorkflowResultError).code).toBe("workflow_result_missing");
      expect((error as Error).message).toBe("workflow_result_missing:audit:index=1");
    }
    expect(normalized).toBe(false);
    expect(classifiedClean).toBe(false);
  });

  test("wrong identity aborts before findings are flattened or classified", () => {
    const flattened: unknown[] = [];
    let classifiedClean = false;
    try {
      const validated = requireAllResults(
        [
          envelope("file:a.ts", { findings: [{ severity: "HIGH", finding: "x" }] }),
          envelope("file:rogue.ts", { findings: [] }),
        ],
        ["file:a.ts", "file:b.ts"],
        "audit"
      );
      for (const result of validated) {
        flattened.push(...((result.value as { findings: unknown[] }).findings ?? []));
      }
      classifiedClean = true;
    } catch (error) {
      expect((error as WorkflowResultError).code).toBe("workflow_result_identity_wrong");
      expect((error as Error).message).toBe("workflow_result_identity_wrong:audit:index=1");
    }
    expect(flattened).toEqual([]);
    expect(classifiedClean).toBe(false);
  });

  test("count mismatch aborts before a clean classification callback runs", () => {
    let classifiedClean = false;
    try {
      requireAllResults(
        [envelope("file:a.ts", { findings: [] })],
        ["file:a.ts", "file:b.ts"],
        "audit"
      );
      classifiedClean = true;
    } catch (error) {
      expect((error as WorkflowResultError).code).toBe("workflow_result_count_mismatch");
      expect((error as Error).message).toBe(
        "workflow_result_count_mismatch:audit:expected=2,actual=1"
      );
    }
    expect(classifiedClean).toBe(false);
  });
});
