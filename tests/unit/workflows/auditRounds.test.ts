import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  WorkflowResultError,
  requireAllResults,
} from "../../../_docs/_workflows/lib/workflow-contracts.mjs";
import type {
  WorkflowResultEnvelope,
  WorkflowStructuredFinding,
} from "../../../_docs/_workflows/lib/workflow-contracts.mjs";
import {
  deriveChangedScopeIds,
  requireDeclaredAffectedScopeIds,
  requireExactIdentitySet,
  runCanonicalAuditRounds,
  selectVerifiedAffectedGroups,
} from "../../../_docs/_workflows/lib/audit-rounds.mjs";
import type {
  CanonicalAuditGroup,
  CanonicalAuditRoundsOptions,
} from "../../../_docs/_workflows/lib/audit-rounds.mjs";

// ---------------------------------------------------------------------------
// Synthetic driver harness. The driver test is the sole behavioral owner of
// the canonical round engine and never imports live workflow scripts: it uses
// in-memory synthetic files, fingerprints, audit/reconcile/fix jobs only.
// ---------------------------------------------------------------------------

type AuditPayload = { pass: boolean; summary: string; findings: WorkflowStructuredFinding[] };

const A = "_docs/_TASKS/TASK-522-a.md";
const B = "_docs/_TASKS/TASK-522-b.md";
const GROUP_A: CanonicalAuditGroup = { repoRelativePath: A };
const GROUP_B: CanonicalAuditGroup = { repoRelativePath: B };

const digest = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const fileFingerprint = (path: string, bytes: string): string => digest(`${path}\0${bytes}`);

const finding = (
  severity: WorkflowStructuredFinding["severity"],
  name: string,
  extra: Partial<WorkflowStructuredFinding> = {}
): WorkflowStructuredFinding => ({ severity, finding: name, area: "test", ...extra });

const cleanPayload = (): AuditPayload => ({ pass: true, summary: "clean", findings: [] });

// Mutable synthetic repository: file bytes, HEAD, and porcelain dirty context.
class SyntheticRepo {
  files = new Map<string, string>([
    [A, "a-v1"],
    [B, "b-v1"],
  ]);
  head = "head-1";
  dirty: string[] = [];

  bytes(path: string): string {
    return this.files.get(path) ?? "missing";
  }

  setBytes(path: string, bytes: string): void {
    this.files.set(path, bytes);
  }

  addDirty(path: string): void {
    this.dirty.push(path);
  }

  fingerprint(scopes: readonly CanonicalAuditGroup[]): string {
    const paths = scopes.map((group) => group.repoRelativePath).sort();
    const parts = [
      `head=${this.head}`,
      `dirty=${[...this.dirty].sort().join(",")}`,
      ...paths.map((path) => `${path}\0${this.bytes(path)}`),
    ];
    return digest(parts.join("|"));
  }

  fingerprintUniverse(groups: readonly CanonicalAuditGroup[]): string {
    return this.fingerprint(groups);
  }

  async fingerprintEveryScope(groups: readonly CanonicalAuditGroup[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const group of groups) out[group.repoRelativePath] = fileFingerprint(group.repoRelativePath, this.bytes(group.repoRelativePath));
    return out;
  }
}

interface Harness {
  repo: SyntheticRepo;
  auditCalls: Array<{ group: string; round: number }>;
  reconcileCalls: Array<{ round: number; changedScopes: string[] }>;
  fixCalls: Array<{ round: number; actionable: readonly WorkflowStructuredFinding[] }>;
  run: (options?: Partial<CanonicalAuditRoundsOptions>) => Promise<unknown>;
}

interface HarnessOptions {
  groups?: CanonicalAuditGroup[];
  maximumFixPasses?: number;
  // Returns the payload for a group audit; receives the harness for mutation.
  audit?: (group: CanonicalAuditGroup, round: number, harness: Harness) => unknown;
  reconcile?: (
    context: { round: number; changedScopes: readonly CanonicalAuditGroup[] },
    harness: Harness
  ) => unknown;
  // Returns the fixer result; may mutate the repo through the harness.
  fix?: (
    actionable: readonly WorkflowStructuredFinding[],
    round: number,
    harness: Harness
  ) => unknown;
  label?: string;
}

function makeHarness(options: HarnessOptions = {}): Harness {
  const repo = new SyntheticRepo();
  const auditCalls: Harness["auditCalls"] = [];
  const reconcileCalls: Harness["reconcileCalls"] = [];
  const fixCalls: Harness["fixCalls"] = [];
  const harness: Harness = {
    repo,
    auditCalls,
    reconcileCalls,
    fixCalls,
    run: () => Promise.resolve(undefined),
  };
  const groups = options.groups ?? [GROUP_A, GROUP_B];
  const auditFile = async (group: CanonicalAuditGroup, round: number) => {
    auditCalls.push({ group: group.repoRelativePath, round });
    return options.audit
      ? options.audit(group, round, harness)
      : cleanPayload();
  };
  const reconcile = async (context: { round: number; changedScopes: readonly CanonicalAuditGroup[] }) => {
    reconcileCalls.push({
      round: context.round,
      changedScopes: context.changedScopes.map((group) => group.repoRelativePath),
    });
    return options.reconcile
      ? options.reconcile(context, harness)
      : cleanPayload();
  };
  const fix = async (actionable: readonly WorkflowStructuredFinding[], round: number) => {
    fixCalls.push({ round, actionable });
    if (!options.fix) {
      throw new Error("test harness fixer was invoked without a fix plan");
    }
    return options.fix(actionable, round, harness);
  };
  harness.run = (overrides: Partial<CanonicalAuditRoundsOptions> = {}) =>
    runCanonicalAuditRounds({
      maximumFixPasses: options.maximumFixPasses ?? 8,
      groups,
      auditFile,
      reconcile,
      fix,
      fingerprint: (scopes: readonly CanonicalAuditGroup[]) => repo.fingerprint(scopes),
      fingerprintUniverse: (all: readonly CanonicalAuditGroup[]) => repo.fingerprintUniverse(all),
      fingerprintEveryScope: (all: readonly CanonicalAuditGroup[]) => repo.fingerprintEveryScope(all),
      label: "test:canonical",
      ...overrides,
    });
  return harness;
}

beforeEach(async () => {
  (globalThis as Record<string, unknown>).parallel = (
    jobs: Array<() => Promise<unknown>>
  ): Promise<unknown[]> => Promise.all(jobs.map((job) => job()));
});

afterEach(async () => {
  delete (globalThis as Record<string, unknown>).parallel;
});

async function expectWorkflowError(
  fn: () => unknown,
  code: string,
  label: string,
  detail: string
): Promise<void> {
  let error: unknown;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  if (error === undefined) {
    throw new Error(`expected WorkflowResultError ${code}:${label}:${detail}, got no throw`);
  }
  expect(error).toBeInstanceOf(WorkflowResultError);
  expect((error as WorkflowResultError).name).toBe("WorkflowResultError");
  expect((error as WorkflowResultError).code).toBe(code);
  expect((error as WorkflowResultError).label).toBe(label);
  expect((error as WorkflowResultError).message).toBe(`${code}:${label}:${detail}`);
}

// ---------------------------------------------------------------------------
// One complete clean pass
// ---------------------------------------------------------------------------

describe("complete clean pass", async () => {
  test("converges immediately with one audit per group and exactly one reconcile", async () => {
    const harness = makeHarness();
    const result = await harness.run() as { pass: boolean; rounds: Array<{ expected: number }> };
    expect(result.pass).toBe(true);
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0].expected).toBe(3); // two groups + one reconcile
    expect(harness.auditCalls).toEqual([
      { group: A, round: 1 },
      { group: B, round: 1 },
    ]);
    expect(harness.reconcileCalls).toEqual([{ round: 1, changedScopes: [A, B] }]);
    expect(harness.fixCalls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Missing / invalid results abort before classification
// ---------------------------------------------------------------------------

describe("result completeness guards", async () => {
  test("a missing per-file result aborts before any classification", async () => {
    const harness = makeHarness({
      audit: (group) => (group.repoRelativePath === B ? null : cleanPayload()),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_result_missing",
      "test:canonical:round:1",
      "index=1"
    );
    expect(harness.fixCalls).toEqual([]);
  });

  test("a missing reconcile result aborts before any classification", async () => {
    const harness = makeHarness({ reconcile: () => undefined });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_result_missing",
      "test:canonical:round:1",
      "index=2"
    );
  });

  test("nullish envelope values abort before collectStructuredFindings", async () => {
    for (const missing of [null, undefined]) {
      const harness = makeHarness({
        audit: (group) => (group.repoRelativePath === A ? missing : cleanPayload()),
      });
      await expectWorkflowError(
        () => harness.run(),
        "workflow_result_missing",
        "test:canonical:round:1",
        "index=0"
      );
    }
  });

  test("duplicate group identities reject before dispatch", async () => {
    const harness = makeHarness({ groups: [GROUP_A, { repoRelativePath: A }] });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_groups_invalid",
      "test:canonical",
      "duplicate:1"
    );
  });

  test("wrong, duplicate, and reordered file identities are rejected by the wrapper contract", async () => {
    const expected = [`file:${A}`, `file:${B}`, "reconcile"];
    const envelopes = (identities: string[]): WorkflowResultEnvelope<unknown>[] =>
      identities.map((identity, index) => ({ identity, value: { pass: true, findings: [] } }));

    await expectWorkflowError(
      () => requireAllResults(envelopes([`file:${A}`, "reconcile", `file:${B}`]), expected, "wrap"),
      "workflow_result_identity_reordered",
      "wrap",
      "index=1"
    );
    await expectWorkflowError(
      () => requireAllResults(envelopes([`file:${A}`, `file:unknown.md`, "reconcile"]), expected, "wrap"),
      "workflow_result_identity_wrong",
      "wrap",
      "index=1"
    );
    await expectWorkflowError(
      () => requireAllResults(envelopes([`file:${A}`, `file:${A}`, "reconcile"]), expected, "wrap"),
      "workflow_result_identity_duplicate",
      "wrap",
      "index=1"
    );
  });

  test("two reconciles are rejected by the wrapper contract", async () => {
    const envelopes = (identities: string[]): WorkflowResultEnvelope<unknown>[] =>
      identities.map((identity, index) => ({ identity, value: { pass: true, findings: [] } }));
    await expectWorkflowError(
      () =>
        requireAllResults(
          envelopes(["reconcile", "reconcile"]),
          ["reconcile", "reconcile"],
          "wrap"
        ),
      "workflow_expected_identities_invalid",
      "wrap",
      "identity_set"
    );
  });

  test("the driver never emits a second reconcile outside the pass", async () => {
    const harness = makeHarness({ maximumFixPasses: 1 });
    // Round 1 clean: exactly one reconcile. The driver has no other hook that
    // could invoke the reconcile callback.
    const result = await harness.run() as { pass: boolean };
    expect(result.pass).toBe(true);
    expect(harness.reconcileCalls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Revision fingerprint guards
// ---------------------------------------------------------------------------

describe("revision fingerprints", async () => {
  test("audited bytes changing during dispatch abort before classification", async () => {
    const harness = makeHarness({
      audit: (group) => {
        if (group.repoRelativePath === A) harness.repo.setBytes(B, "b-mutated-during-dispatch");
        return cleanPayload();
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_audit_revision_changed",
      "test:canonical",
      "round=1"
    );
    expect(harness.fixCalls).toEqual([]);
  });

  test("HEAD changing during dispatch aborts before classification", async () => {
    const harness = makeHarness({
      audit: (group) => {
        if (group.repoRelativePath === A) harness.repo.head = "head-mutated";
        return cleanPayload();
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_audit_revision_changed",
      "test:canonical",
      "round=1"
    );
  });

  test("relevant dirty context changing during dispatch aborts before classification", async () => {
    const harness = makeHarness({
      audit: (group) => {
        if (group.repoRelativePath === A) harness.repo.addDirty("_docs/other.md");
        return cleanPayload();
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_audit_revision_changed",
      "test:canonical",
      "round=1"
    );
  });
});

// ---------------------------------------------------------------------------
// Fixer flow: affected-scope reruns, LOW retention, promotion, rejection
// ---------------------------------------------------------------------------

describe("fixer flow", async () => {
  test("HIGH/MEDIUM trigger a fixer and only the fingerprint-derived affected scopes plus reconcile rerun", async () => {
    const harness = makeHarness({
      maximumFixPasses: 2,
      audit: (group, round) =>
        round === 1 && group.repoRelativePath === A
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "grounding gap")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        return { applied: ["fix A"], residual: [], affectedScopeIds: [A] };
      },
    });
    const result = await harness.run() as {
      pass: boolean;
      rounds: Array<{ round: number; expected: number; actionable: WorkflowStructuredFinding[] }>;
    };
    expect(result.pass).toBe(true);
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[1].expected).toBe(2); // one affected group + one reconcile
    expect(harness.auditCalls).toEqual([
      { group: A, round: 1 },
      { group: B, round: 1 },
      { group: A, round: 2 }, // only the changed scope reruns
    ]);
    expect(harness.reconcileCalls).toEqual([
      { round: 1, changedScopes: [A, B] },
      { round: 2, changedScopes: [A] },
    ]);
    expect(harness.fixCalls).toHaveLength(1);
  });

  test("unchanged clean scopes never replay", async () => {
    const harness = makeHarness({
      maximumFixPasses: 2,
      audit: (group, round) =>
        round === 1 && group.repoRelativePath === A
          ? { pass: false, summary: "issues", findings: [finding("MEDIUM", "citation")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        return { applied: ["fix A"], residual: [], affectedScopeIds: [A] };
      },
    });
    const result = await harness.run() as { pass: boolean };
    expect(result.pass).toBe(true);
    const auditPaths = harness.auditCalls.map((call) => call.group);
    expect(auditPaths).toEqual([A, B, A]); // B appears only in the complete pass
  });

  test("a genuine LOW stays visible and does not block HIGH/MEDIUM convergence", async () => {
    const harness = makeHarness({
      maximumFixPasses: 2,
      audit: (group, round) => {
        if (group.repoRelativePath !== A) return cleanPayload();
        const findings: WorkflowStructuredFinding[] = [finding("LOW", "docs polish", { area: "style" })];
        if (round === 1) findings.push(finding("HIGH", "grounding gap"));
        return { pass: round > 1, summary: round > 1 ? "clean" : "issues", findings };
      },
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        return { applied: ["fix A"], residual: [], affectedScopeIds: [A] };
      },
    });
    const result = await harness.run() as {
      pass: boolean;
      rounds: Array<{ retainedLow: WorkflowStructuredFinding[] }>;
      findings: WorkflowStructuredFinding[];
    };
    expect(result.pass).toBe(true);
    expect(result.rounds[0].retainedLow.map((item) => item.finding)).toEqual(["docs polish"]);
    expect(result.findings.map((item) => item.finding)).toContain("docs polish");
  });

  test("executability/test-integrity impact cannot remain LOW and routes through the fixer", async () => {
    const harness = makeHarness({
      maximumFixPasses: 2,
      audit: (group, round) =>
        round === 1 && group.repoRelativePath === A
          ? {
              pass: false,
              summary: "issues",
              findings: [finding("LOW", "weakened assertion", { area: "test-integrity" })],
            }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        return { applied: ["fix A"], residual: [], affectedScopeIds: [A] };
      },
    });
    const result = await harness.run() as {
      pass: boolean;
      rounds: Array<{ retainedLow: WorkflowStructuredFinding[] }>;
    };
    expect(result.pass).toBe(true);
    // The promoted finding is actionable (MEDIUM) and never retained as LOW.
    expect(harness.fixCalls).toHaveLength(1);
    expect(harness.fixCalls[0].actionable[0].severity).toBe("MEDIUM");
    expect(result.rounds[0].retainedLow).toEqual([]);
  });

  test("a fixer no-op rejects with workflow_fixer_no_change", async () => {
    const harness = makeHarness({
      audit: (group, round) =>
        round === 1 && group.repoRelativePath === A
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "gap")] }
          : cleanPayload(),
      fix: () => ({ applied: [], residual: [], affectedScopeIds: [A] }),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_fixer_no_change",
      "test:canonical",
      "round=1"
    );
  });

  test("an unknown declared scope rejects with workflow_fixer_declared_scope_invalid", async () => {
    const harness = makeHarness({
      audit: (group, round) =>
        round === 1 && group.repoRelativePath === A
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "gap")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        return { applied: ["fix A"], residual: [], affectedScopeIds: ["docs/unknown.md"] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_fixer_declared_scope_invalid",
      "test:canonical",
      "unknown:0"
    );
  });

  test("declared A with actual A+B rejects before any receipt reuse", async () => {
    const harness = makeHarness({
      audit: (group, round) =>
        round === 1 && (group.repoRelativePath === A || group.repoRelativePath === B)
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "gap")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        state.repo.setBytes(B, "b-v2");
        return { applied: ["fix A+B"], residual: [], affectedScopeIds: [A] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_fixer_declared_scope_mismatch",
      "test:canonical:fix:1",
      `declared=${A},actual=${A},${B}`
    );
    // No affected-only rerun may start after the rejection.
    expect(harness.auditCalls).toHaveLength(2);
  });

  test("declared A+B with actual A rejects before any receipt reuse", async () => {
    const harness = makeHarness({
      audit: (group, round) =>
        round === 1 && (group.repoRelativePath === A || group.repoRelativePath === B)
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "gap")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        return { applied: ["fix A"], residual: [], affectedScopeIds: [A, B] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_fixer_declared_scope_mismatch",
      "test:canonical:fix:1",
      `declared=${A},${B},actual=${A}`
    );
    expect(harness.auditCalls).toHaveLength(2);
  });

  test("an unexpected change rejects before receipt reuse and requires a fresh complete pass", async () => {
    const harness = makeHarness({
      audit: (group, round) =>
        round === 1 && group.repoRelativePath === A
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "gap")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, "a-v2");
        state.repo.setBytes(B, "b-unexpected");
        return { applied: ["fix A"], residual: [], affectedScopeIds: [A] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_fixer_declared_scope_mismatch",
      "test:canonical:fix:1",
      `declared=${A},actual=${A},${B}`
    );
    // The rejected round must not continue as an affected-only pass.
    expect(harness.auditCalls).toHaveLength(2);
  });

  test("an unmappable mutation invalidates all retained receipts", async () => {
    const harness = makeHarness({
      audit: (group, round) =>
        round === 1 && group.repoRelativePath === A
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "gap")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        // Mutates only an unowned path: the universe fingerprint changes while
        // no declared scope fingerprint does.
        state.repo.addDirty("docs/unowned.md");
        return { applied: ["touched unowned"], residual: [], affectedScopeIds: [A] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_fixer_unmappable_change",
      "test:canonical",
      "round=1"
    );
    expect(harness.auditCalls).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Non-convergence
// ---------------------------------------------------------------------------

describe("non-convergence", async () => {
  test("maximum-fix-pass exhaustion is explicit", async () => {
    const harness = makeHarness({
      maximumFixPasses: 2,
      audit: (group) =>
        group.repoRelativePath === A
          ? { pass: false, summary: "issues", findings: [finding("HIGH", "persistent")] }
          : cleanPayload(),
      fix: (_actionable, _round, state) => {
        state.repo.setBytes(A, `a-${state.repo.bytes(A)}`);
        return { applied: ["fix A"], residual: [], affectedScopeIds: [A] };
      },
    });
    const result = await harness.run() as {
      pass: boolean;
      reason?: string;
      rounds: unknown[];
      findings: WorkflowStructuredFinding[];
    };
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("audit_not_converged");
    expect(result.rounds).toHaveLength(3); // maximumFixPasses + 1
    expect(result.findings.map((item) => item.finding)).toContain("persistent");
  });
});

// ---------------------------------------------------------------------------
// Exported helper edge cases
// ---------------------------------------------------------------------------

describe("exported driver helpers", async () => {
  test("requireDeclaredAffectedScopeIds validates and normalizes the declared claim", async () => {
    const groups = [GROUP_A, GROUP_B];
    expect(requireDeclaredAffectedScopeIds({ affectedScopeIds: [B, A] }, groups, "h")).toEqual([A, B]);
    await expectWorkflowError(
      () => requireDeclaredAffectedScopeIds({ affectedScopeIds: [] }, groups, "h"),
      "workflow_fixer_declared_scope_invalid",
      "h",
      "empty"
    );
    await expectWorkflowError(
      () => requireDeclaredAffectedScopeIds(null, groups, "h"),
      "workflow_fixer_declared_scope_invalid",
      "h",
      "missing_result"
    );
    await expectWorkflowError(
      () => requireDeclaredAffectedScopeIds({ affectedScopeIds: ["docs/unknown.md"] }, groups, "h"),
      "workflow_fixer_declared_scope_invalid",
      "h",
      "unknown:0"
    );
    await expectWorkflowError(
      () => requireDeclaredAffectedScopeIds({ affectedScopeIds: [A, A] }, groups, "h"),
      "workflow_fixer_declared_scope_invalid",
      "h",
      "duplicate:1"
    );
  });

  test("deriveChangedScopeIds returns only fingerprint differences in sorted order", async () => {
    const before = { [B]: "old-b", [A]: "old-a" };
    const after = { [B]: "new-b", [A]: "old-a" };
    expect(deriveChangedScopeIds(before, after)).toEqual([B]);
    expect(deriveChangedScopeIds(before, { ...before, [A]: "new-a" })).toEqual([A]);
    // A scope mapping that appears on exactly one side counts as changed.
    expect(deriveChangedScopeIds(before, { [B]: "old-b" })).toEqual([A]);
  });

  test("requireExactIdentitySet accepts only exact declared-versus-actual equality", async () => {
    expect(() => requireExactIdentitySet([A], [A], "h")).not.toThrow();
    await expectWorkflowError(
      () => requireExactIdentitySet([A], [A, B], "h"),
      "workflow_fixer_declared_scope_mismatch",
      "h",
      `declared=${A},actual=${A},${B}`
    );
    await expectWorkflowError(
      () => requireExactIdentitySet([A, B], [A], "h"),
      "workflow_fixer_declared_scope_mismatch",
      "h",
      `declared=${A},${B},actual=${A}`
    );
    await expectWorkflowError(
      () => requireExactIdentitySet([A, A], [A], "h"),
      "workflow_fixer_declared_scope_mismatch",
      "h",
      "duplicate_ids"
    );
  });

  test("selectVerifiedAffectedGroups preserves declared group order", async () => {
    const groups = [GROUP_B, GROUP_A];
    expect(selectVerifiedAffectedGroups(groups, [A, B]).map((group) => group.repoRelativePath)).toEqual([B, A]);
    expect(selectVerifiedAffectedGroups(groups, [A]).map((group) => group.repoRelativePath)).toEqual([A]);
  });

  test("a missing parallel global is a clear driver error", async () => {
    delete (globalThis as Record<string, unknown>).parallel;
    const harness = makeHarness();
    await expectWorkflowError(
      () => harness.run(),
      "workflow_parallel_missing",
      "runCanonicalAuditRounds",
      "global_parallel"
    );
  });
});
