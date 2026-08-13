import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  WorkflowResultError,
} from "../../../_docs/_workflows/lib/workflow-contracts.mjs";
import type {
  WorkflowResultEnvelope,
  WorkflowStructuredFinding,
} from "../../../_docs/_workflows/lib/workflow-contracts.mjs";
import {
  deriveChangedLensKeys,
  requireExactIdentitySet,
  requireNonEmptyAffectedLensSubset,
  runCanonicalPostAudit,
} from "../../../_docs/_workflows/lib/post-audit.mjs";
import type {
  CanonicalPostAuditLens,
  CanonicalPostAuditOptions,
} from "../../../_docs/_workflows/lib/post-audit.mjs";

// ---------------------------------------------------------------------------
// Synthetic driver harness. The driver test is the sole behavioral owner of
// the canonical post-audit engine and never imports live workflow scripts: it
// uses in-memory synthetic files, fingerprints, lens audit/fix/validate jobs
// only.
// ---------------------------------------------------------------------------

type AuditPayload = { pass: boolean; summary: string; findings: WorkflowStructuredFinding[] };

const A = "_docs/_TASKS/TASK-545-a.md";
const B = "_docs/_TASKS/TASK-545-b.md";
const SHARED = "_docs/_TASKS/TASK-545-shared.md";
const LENS_A: CanonicalPostAuditLens = { key: "scope-fidelity", label: "Scope fidelity lens" };
const LENS_B: CanonicalPostAuditLens = { key: "test-integrity", label: "Test integrity lens" };

const digest = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const fileFingerprint = (path: string, bytes: string): string => digest(`${path}\0${bytes}`);

const finding = (
  severity: WorkflowStructuredFinding["severity"],
  name: string,
  extra: Partial<WorkflowStructuredFinding> = {}
): WorkflowStructuredFinding => ({ severity, finding: name, area: "test", ...extra });

const cleanPayload = (): AuditPayload => ({ pass: true, summary: "clean", findings: [] });

// Mutable synthetic repository: lens input files, HEAD, and porcelain dirty
// context. The pass-level fingerprint and the fix-path universe fingerprint
// cover exactly the same full state, so callers can prove one consistent
// full-universe digest; the explicit stale-drift test overrides the universe
// fingerprint to prove the between-pass guard.
class SyntheticRepo {
  files = new Map<string, string>([
    [A, "a-v1"],
    [B, "b-v1"],
    [SHARED, "shared-v1"],
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
    if (!this.dirty.includes(path)) this.dirty.push(path);
  }

  fingerprint(lenses: readonly CanonicalPostAuditLens[]): string {
    const parts = [
      `head=${this.head}`,
      `dirty=${[...this.dirty].sort().join(",")}`,
      ...[...this.files.keys()].sort().map((path) => `${path}\0${this.bytes(path)}`),
    ];
    return digest(parts.join("|"));
  }

  fingerprintUniverse(lenses: readonly CanonicalPostAuditLens[]): string {
    return this.fingerprint(lenses);
  }

  async fingerprintEveryLensInput(
    lenses: readonly CanonicalPostAuditLens[]
  ): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const lens of lenses) {
      const paths = this.lensInputs(lens);
      const parts = paths.map((path) => fileFingerprint(path, this.bytes(path)));
      out[lens.key] = digest(parts.join("|"));
    }
    return out;
  }

  lensInputs(lens: CanonicalPostAuditLens): string[] {
    if (lens.key === "scope-fidelity") return [A, SHARED];
    return [B, SHARED];
  }
}

// The audit-round harness types are reused for the repository fingerprint
// callbacks; the post-audit driver itself operates on lenses only.
interface Harness {
  repo: SyntheticRepo;
  runLensCalls: Array<{ key: string; label?: string; pass: number }>;
  fixCalls: Array<{ pass: number; blocking: readonly WorkflowStructuredFinding[] }>;
  validateCalls: Array<{ affectedLensKeys: string[] }>;
  run: (options?: Partial<CanonicalPostAuditOptions>) => Promise<unknown>;
}

interface HarnessOptions {
  lenses?: CanonicalPostAuditLens[];
  maximumFixPasses?: number;
  // Returns the payload for a lens audit; receives the harness for mutation.
  runLens?: (lens: CanonicalPostAuditLens, pass: number, harness: Harness) => unknown;
  // Returns the fixer result; may mutate the repo through the harness.
  fix?: (
    blocking: readonly WorkflowStructuredFinding[],
    pass: number,
    harness: Harness
  ) => unknown;
  // Optional validation side effects through the harness.
  validate?: (affectedLensKeys: readonly string[], harness: Harness) => void;
}

function makeHarness(options: HarnessOptions = {}): Harness {
  const repo = new SyntheticRepo();
  const runLensCalls: Harness["runLensCalls"] = [];
  const fixCalls: Harness["fixCalls"] = [];
  const validateCalls: Harness["validateCalls"] = [];
  const harness: Harness = {
    repo,
    runLensCalls,
    fixCalls,
    validateCalls,
    run: () => Promise.resolve(undefined),
  };
  const lenses = options.lenses ?? [LENS_A, LENS_B];
  const runLens = async (lens: CanonicalPostAuditLens, pass: number) => {
    runLensCalls.push({ key: lens.key, label: lens.label as string | undefined, pass });
    return options.runLens ? options.runLens(lens, pass, harness) : cleanPayload();
  };
  const fix = async (blocking: readonly WorkflowStructuredFinding[], pass?: number) => {
    fixCalls.push({ pass: pass ?? -1, blocking });
    if (!options.fix) {
      throw new Error("test harness fixer was invoked without a fix plan");
    }
    return options.fix(blocking, pass ?? -1, harness);
  };
  const validate = async (fixResult: Record<string, unknown>) => {
    const affectedLensKeys = (fixResult.affectedLensKeys ?? []) as string[];
    validateCalls.push({ affectedLensKeys });
    if (options.validate) options.validate(affectedLensKeys, harness);
  };
  harness.run = (overrides: Partial<CanonicalPostAuditOptions> = {}) =>
    runCanonicalPostAudit({
      maximumFixPasses: options.maximumFixPasses ?? 3,
      lenses,
      runLens,
      fix,
      validate,
      fingerprint: () => repo.fingerprint(lenses),
      fingerprintUniverse: (all: readonly CanonicalPostAuditLens[]) => repo.fingerprintUniverse(all),
      fingerprintEveryLensInput: (all: readonly CanonicalPostAuditLens[]) =>
        repo.fingerprintEveryLensInput(all),
      label: "test:post-audit",
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
// Lens identity and driver contract validation
// ---------------------------------------------------------------------------

describe("lens identity validation", () => {
  test("a single lens is a valid non-empty exact identity set", async () => {
    const harness = makeHarness({ lenses: [LENS_A] });
    const result = (await harness.run()) as { pass: boolean; receipts: Record<string, unknown> };
    expect(result.pass).toBe(true);
    expect(harness.runLensCalls).toEqual([{ key: "scope-fidelity", label: "Scope fidelity lens", pass: 0 }]);
    expect(Object.keys(result.receipts)).toEqual(["scope-fidelity"]);
  });

  test("zero lenses reject before any dispatch", async () => {
    const harness = makeHarness({ lenses: [] });
    await expectWorkflowError(() => harness.run(), "workflow_lenses_invalid", "test:post-audit", "empty_or_not_array");
    expect(harness.runLensCalls).toEqual([]);
  });

  test("duplicate or unsafe lens keys reject", async () => {
    const duplicate = makeHarness({ lenses: [LENS_A, { key: "scope-fidelity" }] });
    await expectWorkflowError(() => duplicate.run(), "workflow_lenses_invalid", "test:post-audit", "duplicate:1");
    const unsafe = makeHarness({ lenses: [LENS_A, { key: "Scope-Fidelity" }] });
    await expectWorkflowError(() => unsafe.run(), "workflow_lenses_invalid", "test:post-audit", "index=1");
    const missing = makeHarness({ lenses: [{ label: "no key" } as unknown as CanonicalPostAuditLens] });
    await expectWorkflowError(() => missing.run(), "workflow_lenses_invalid", "test:post-audit", "index=0");
  });

  test("the bounded fix budget is exactly 1..3", async () => {
    const harness = makeHarness();
    await expectWorkflowError(
      () => harness.run({ maximumFixPasses: 0 }),
      "workflow_maximum_fix_passes_invalid",
      "test:post-audit",
      "value=0"
    );
    await expectWorkflowError(
      () => harness.run({ maximumFixPasses: 4 }),
      "workflow_maximum_fix_passes_invalid",
      "test:post-audit",
      "value=4"
    );
    await expectWorkflowError(
      () => harness.run({ maximumFixPasses: 1.5 }),
      "workflow_maximum_fix_passes_invalid",
      "test:post-audit",
      "value=1.5"
    );
  });

  test("missing callbacks or fingerprint reject", async () => {
    const harness = makeHarness();
    await expectWorkflowError(
      () => harness.run({ runLens: undefined }),
      "workflow_driver_contract_invalid",
      "test:post-audit",
      "callbacks"
    );
    await expectWorkflowError(
      () => harness.run({ fix: undefined }),
      "workflow_driver_contract_invalid",
      "test:post-audit",
      "callbacks"
    );
    await expectWorkflowError(
      () => harness.run({ validate: undefined }),
      "workflow_driver_contract_invalid",
      "test:post-audit",
      "callbacks"
    );
    await expectWorkflowError(
      () => harness.run({ fingerprint: undefined }),
      "workflow_driver_contract_invalid",
      "test:post-audit",
      "fingerprint"
    );
  });

  test("a missing parallel global is a clear driver error", async () => {
    const harness = makeHarness();
    delete (globalThis as Record<string, unknown>).parallel;
    await expectWorkflowError(
      () => harness.run(),
      "workflow_parallel_missing",
      "runCanonicalPostAudit",
      "global_parallel"
    );
  });
});

// ---------------------------------------------------------------------------
// Result envelope contract
// ---------------------------------------------------------------------------

describe("result envelope integrity", () => {
  test("correctly identified null envelopes abort before findings flattening", async () => {
    const harness = makeHarness({
      runLens: (lens) => (lens.key === "scope-fidelity" ? null : cleanPayload()),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_result_missing",
      "test:post-audit:post-audit:0",
      "index=0"
    );
  });

  test("correctly identified undefined envelopes abort before findings flattening", async () => {
    const harness = makeHarness({
      runLens: (lens) => (lens.key === "test-integrity" ? undefined : cleanPayload()),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_result_missing",
      "test:post-audit:post-audit:0",
      "index=1"
    );
  });

  test("wrong, duplicate, and reordered lens identities fail before findings are read", async () => {
    for (const [scenario, mutate] of [
      ["reordered", (results: WorkflowResultEnvelope[]) => [results[1], results[0]]],
      [
        "duplicate",
        (results: WorkflowResultEnvelope[]) => [
          results[0],
          { identity: results[0].identity, value: results[0].value },
        ],
      ],
      [
        "wrong",
        (results: WorkflowResultEnvelope[]) => [
          results[0],
          { identity: "lens:other", value: results[1].value },
        ],
      ],
      ["missing", (results: WorkflowResultEnvelope[]) => [results[0]]],
    ] as Array<[string, (results: WorkflowResultEnvelope[]) => WorkflowResultEnvelope[]]>) {
      const harness = makeHarness();
      const originalParallel = (globalThis as Record<string, unknown>).parallel;
      (globalThis as Record<string, unknown>).parallel = async (
        jobs: Array<() => Promise<WorkflowResultEnvelope>>
      ) => mutate(await Promise.all(jobs.map((job) => job())));
      let error: unknown;
      try {
        await harness.run();
      } catch (caught) {
        error = caught;
      } finally {
        (globalThis as Record<string, unknown>).parallel = originalParallel;
      }
      expect(error).toBeInstanceOf(WorkflowResultError);
      const resultError = error as WorkflowResultError;
      if (scenario === "reordered") {
        expect(resultError.code).toBe("workflow_result_identity_reordered");
      } else if (scenario === "duplicate") {
        expect(resultError.code).toBe("workflow_result_identity_duplicate");
      } else if (scenario === "wrong") {
        expect(resultError.code).toBe("workflow_result_identity_wrong");
      } else {
        expect(resultError.code).toBe("workflow_result_count_mismatch");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Bounded fixes, affected-lens reruns, and receipt retention
// ---------------------------------------------------------------------------

describe("fix convergence", () => {
  test("a single bounded fix converges and validates targeted gates", async () => {
    const harness = makeHarness({
      runLens: (lens, pass) =>
        lens.key === "scope-fidelity" && pass === 0
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    const result = (await harness.run()) as {
      pass: boolean;
      passes: Array<{ pass: number; lensKeys: string[] }>;
      receipts: Record<string, unknown>;
    };
    expect(result.pass).toBe(true);
    expect(harness.runLensCalls.map((call) => `${call.key}:${call.pass}`)).toEqual([
      "scope-fidelity:0",
      "test-integrity:0",
      "scope-fidelity:1",
    ]);
    expect(result.passes.map((pass) => pass.lensKeys)).toEqual([
      ["scope-fidelity", "test-integrity"],
      ["scope-fidelity"],
    ]);
    expect(harness.validateCalls.map((call) => call.affectedLensKeys)).toEqual([
      ["scope-fidelity"],
    ]);
    expect(Object.keys(result.receipts).sort()).toEqual(["scope-fidelity", "test-integrity"]);
  });

  test("multiple bounded fixes repeat the cycle up to the budget", async () => {
    let fixNumber = 0;
    const harness = makeHarness({
      maximumFixPasses: 3,
      runLens: (lens, pass) =>
        lens.key === "scope-fidelity" && pass < 2
          ? { pass: true, summary: "finding", findings: [finding("MEDIUM", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        fixNumber += 1;
        h.repo.setBytes(A, `a-fix${fixNumber}`);
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    const result = (await harness.run()) as {
      pass: boolean;
      passes: Array<{ pass: number; lensKeys: string[] }>;
    };
    expect(result.pass).toBe(true);
    expect(result.passes.map((pass) => pass.lensKeys)).toEqual([
      ["scope-fidelity", "test-integrity"],
      ["scope-fidelity"],
      ["scope-fidelity"],
    ]);
  });

  test("affected-lens-only success retains unaffected receipts exactly", async () => {
    const retainedPayload = cleanPayload();
    const harness = makeHarness({
      runLens: (lens, pass) =>
        lens.key === "scope-fidelity" && pass === 0
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : lens.key === "test-integrity"
            ? retainedPayload
            : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    const result = (await harness.run()) as {
      pass: boolean;
      passes: Array<{ pass: number; lensKeys: string[]; expected: number }>;
      receipts: Record<string, unknown>;
    };
    expect(result.pass).toBe(true);
    expect(result.passes.map((pass) => ({ pass: pass.pass, expected: pass.expected }))).toEqual([
      { pass: 0, expected: 2 },
      { pass: 1, expected: 1 },
    ]);
    // The unaffected test-integrity receipt is the very object produced in the
    // initial pass: retained, never re-fetched, never replaced.
    expect(harness.runLensCalls.filter((call) => call.key === "test-integrity")).toHaveLength(1);
    expect(result.receipts["test-integrity"]).toBe(retainedPayload);
  });

  test("residual HIGH/MEDIUM exhausts the bounded budget with explicit non-convergence", async () => {
    let fixNumber = 0;
    const harness = makeHarness({
      maximumFixPasses: 2,
      runLens: (lens, pass) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        fixNumber += 1;
        h.repo.setBytes(A, `a-fix${fixNumber}`);
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    const result = (await harness.run()) as {
      pass: boolean;
      passes: Array<{ pass: number }>;
      reason: string;
    };
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("post_audit_not_converged");
    expect(result.passes).toHaveLength(3); // initial pass + two verified fixes
    expect(harness.fixCalls).toHaveLength(2);
  });

  test("fixer no-op rejects and never reuses receipts", async () => {
    // A truly no-op fixer changes no lens input: the declared claim cannot
    // equal the empty derived set, so the pass rejects before any receipt is
    // reused (declared `A` versus actual ``).
    const harness = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: () => ({ affectedLensKeys: ["scope-fidelity"] }),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_declared_scope_mismatch",
      "test:post-audit:post-fix:0",
      "declared=scope-fidelity,actual="
    );
    // The driver's dedicated no-change guard still fires when an otherwise
    // exact lens change is invisible to a frozen universe fingerprint: a
    // change with no verified universe effect can never be a fixer-owned
    // change.
    const frozenUniverse = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    await expectWorkflowError(
      () =>
        frozenUniverse.run({
          fingerprintUniverse: async () => "frozen-universe",
        }),
      "workflow_post_fixer_no_change",
      "test:post-audit",
      "pass=0"
    );
  });
});

// ---------------------------------------------------------------------------
// Affected-set claims, drift, and validation mutation
// ---------------------------------------------------------------------------

describe("affected-set claim integrity", () => {
  test("unknown affected lens keys reject", async () => {
    const harness = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: () => ({ affectedLensKeys: ["unknown-lens"] }),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_declared_scope_invalid",
      "test:post-audit",
      "unknown:0"
    );
  });

  test("empty affected sets reject", async () => {
    const harness = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: () => ({ affectedLensKeys: [] }),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_declared_scope_invalid",
      "test:post-audit",
      "empty"
    );
  });

  test("duplicate or missing fixer results reject", async () => {
    const harness = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: () => ({ affectedLensKeys: ["scope-fidelity", "scope-fidelity"] }),
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_declared_scope_invalid",
      "test:post-audit",
      "duplicate:1"
    );
    const missingResult = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: () => null,
    });
    await expectWorkflowError(
      () => missingResult.run(),
      "workflow_post_declared_scope_invalid",
      "test:post-audit",
      "missing_result"
    );
  });

  test("declared A with actual A+B rejects before any receipt reuse", async () => {
    const harness = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        // The shared input is consumed by both lenses; declaring only A is an
        // under-declared claim that invalidates every retained receipt.
        h.repo.setBytes(SHARED, "shared-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_declared_scope_mismatch",
      "test:post-audit:post-fix:0",
      "declared=scope-fidelity,actual=scope-fidelity,test-integrity"
    );
  });

  test("declared A+B with actual A rejects before any receipt reuse", async () => {
    const harness = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity", "test-integrity"] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_declared_scope_mismatch",
      "test:post-audit:post-fix:0",
      "declared=scope-fidelity,test-integrity,actual=scope-fidelity"
    );
  });

  test("unmappable shared-input mutation invalidates every retained receipt", async () => {
    const harness = makeHarness({
      runLens: (lens) =>
        lens.key === "scope-fidelity"
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        // The universe changes but no declared lens input captures it: the
        // actual derived set is empty and the driver aborts the whole pass.
        h.repo.setBytes("_docs/_TASKS/TASK-545-unowned.md", "unowned-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_declared_scope_mismatch",
      "test:post-audit:post-fix:0",
      "declared=scope-fidelity,actual="
    );
  });
});

describe("revision and validation guards", () => {
  test("mutation during the initial dispatch aborts stale classification", async () => {
    const harness = makeHarness({
      runLens: (_lens, _pass, h) => {
        h.repo.addDirty("_docs/_TASKS/unexpected.md");
        return cleanPayload();
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_revision_changed",
      "test:post-audit",
      "pass=0"
    );
  });

  test("mutation during an affected dispatch aborts stale classification", async () => {
    const harness = makeHarness({
      runLens: (lens, pass) => {
        if (lens.key === "scope-fidelity" && pass === 1) {
          harness.repo.addDirty("_docs/_TASKS/unexpected.md");
        }
        return lens.key === "scope-fidelity" && pass === 0
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload();
      },
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_revision_changed",
      "test:post-audit",
      "pass=1"
    );
  });

  test("unexpected drift between passes aborts as stale evidence", async () => {
    const harness = makeHarness({
      runLens: (lens, pass) =>
        lens.key === "scope-fidelity" && pass === 0
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    let universeCalls = 0;
    // The verified post-fix universe digest adds an external revision the
    // pass-level fingerprint never reports: the next pass sees stale evidence
    // and cannot classify it.
    await expectWorkflowError(
      () =>
        harness.run({
          fingerprintUniverse: async (all: readonly CanonicalPostAuditLens[]) => {
            universeCalls += 1;
            const base = await new SyntheticRepo().fingerprint(all);
            return digest(`${base}\0universe=${universeCalls >= 2 ? "external" : "none"}`);
          },
        }),
      "workflow_post_revision_changed",
      "test:post-audit",
      "pass=1"
    );
  });

  test("validation mutation rejects after the verified fix", async () => {
    const harness = makeHarness({
      runLens: (lens, pass) =>
        lens.key === "scope-fidelity" && pass === 0
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload(),
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
      validate: (_affected, h) => {
        h.repo.addDirty("_docs/_TASKS/validation-report.md");
      },
    });
    await expectWorkflowError(
      () => harness.run(),
      "workflow_post_validation_mutated_contract",
      "test:post-audit",
      "pass=0"
    );
  });

  test("retained LOW findings stay visible through convergence", async () => {
    const harness = makeHarness({
      runLens: (lens, pass) => {
        if (lens.key === "test-integrity") {
          return { pass: true, summary: "low", findings: [finding("LOW", "optional-note")] };
        }
        return pass === 0
          ? { pass: true, summary: "finding", findings: [finding("HIGH", "scope-drift")] }
          : cleanPayload();
      },
      fix: (_blocking, _pass, h) => {
        h.repo.setBytes(A, "a-v2");
        return { affectedLensKeys: ["scope-fidelity"] };
      },
    });
    const result = (await harness.run()) as {
      pass: boolean;
      findings: WorkflowStructuredFinding[];
      passes: Array<{ findings: WorkflowStructuredFinding[] }>;
    };
    expect(result.pass).toBe(true);
    expect(result.findings.filter((item) => item.severity === "LOW")).toHaveLength(1);
    expect(result.passes).toHaveLength(2);
    // The retained LOW receipt is still collected on the affected pass.
    expect(result.passes[1].findings.filter((item) => item.severity === "LOW")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Exported driver helpers
// ---------------------------------------------------------------------------

describe("exported driver helpers", () => {
  test("requireNonEmptyAffectedLensSubset validates and normalizes the declared claim", () => {
    const lenses = [LENS_A, LENS_B];
    expect(
      requireNonEmptyAffectedLensSubset({ affectedLensKeys: ["test-integrity", "scope-fidelity"] }, lenses, "t")
    ).toEqual(["scope-fidelity", "test-integrity"]);
    expect(() =>
      requireNonEmptyAffectedLensSubset({ affectedLensKeys: [] }, lenses, "t")
    ).toThrow("workflow_post_declared_scope_invalid:t:empty");
    expect(() =>
      requireNonEmptyAffectedLensSubset({ affectedLensKeys: ["unknown"] }, lenses, "t")
    ).toThrow("workflow_post_declared_scope_invalid:t:unknown:0");
    expect(() =>
      requireNonEmptyAffectedLensSubset({ affectedLensKeys: ["scope-fidelity", "scope-fidelity"] }, lenses, "t")
    ).toThrow("workflow_post_declared_scope_invalid:t:duplicate:1");
    expect(() => requireNonEmptyAffectedLensSubset(null, lenses, "t")).toThrow(
      "workflow_post_declared_scope_invalid:t:missing_result"
    );
  });

  test("deriveChangedLensKeys returns only fingerprint differences in sorted order", () => {
    const before = { "scope-fidelity": "x", "test-integrity": "y" };
    const after = { "scope-fidelity": "x", "test-integrity": "z" };
    expect(deriveChangedLensKeys(before, after)).toEqual(["test-integrity"]);
    expect(deriveChangedLensKeys({ a: "1", b: "2" }, { b: "2", c: "3" })).toEqual(["a", "c"]);
    expect(deriveChangedLensKeys(before, before)).toEqual([]);
  });

  test("requireExactIdentitySet accepts only exact declared-versus-actual equality", () => {
    expect(() => requireExactIdentitySet(["a"], ["a"], "t")).not.toThrow();
    expect(() => requireExactIdentitySet(["a"], ["a", "b"], "t")).toThrow(
      "workflow_post_declared_scope_mismatch:t:declared=a,actual=a,b"
    );
    expect(() => requireExactIdentitySet(["a", "b"], ["a"], "t")).toThrow(
      "workflow_post_declared_scope_mismatch:t:declared=a,b,actual=a"
    );
    expect(() => requireExactIdentitySet(["a", "a"], ["a"], "t")).toThrow(
      "workflow_post_declared_scope_mismatch:t:duplicate_ids"
    );
  });

  test("independent lens labels pass through runLens untouched", async () => {
    const harness = makeHarness();
    await harness.run();
    const labels = harness.runLensCalls.map((call) => call.label);
    expect(labels).toEqual(["Scope fidelity lens", "Test integrity lens"]);
  });
});
