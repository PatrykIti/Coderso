export const meta = Object.freeze({
  name: "task-557-implement",
  description:
    "Implement TASK-557 leaves sequentially with per-leaf gates, post-audit, runtime smoke and closure",
  phases: Object.freeze([
    Object.freeze({ title: "Start gate" }),
    Object.freeze({ title: "Sequential leaves" }),
    Object.freeze({ title: "Post-audit" }),
    Object.freeze({ title: "Runtime smoke" }),
    Object.freeze({ title: "Closure" }),
    Object.freeze({ title: "Final drift" }),
  ]),
});

const ROOT = "/home/coder/project/Coderso";
// Land order per umbrella: 01 -> 02 -> 03 -> 04 -> 07 -> 06 -> 05 -> 08.
// 06 lands BEFORE 05 because 05-L02 imports 06-L01's runPureLane and 06-L02's
// PERF_* constants (reconcile HIGH-1 fix in b45d06bc).
const PRODUCT_LEAVES = Object.freeze([
  "TASK-557-01-L01",
  "TASK-557-01-L02",
  "TASK-557-02-L01",
  "TASK-557-02-L02",
  "TASK-557-03-L01",
  "TASK-557-03-L02",
  "TASK-557-03-L03",
  "TASK-557-04-L01",
  "TASK-557-04-L02",
  "TASK-557-07-L01",
  "TASK-557-07-L02",
  "TASK-557-06-L01",
  "TASK-557-06-L02",
  "TASK-557-05-L01",
  "TASK-557-05-L02",
  "TASK-557-05-L03",
  "TASK-557-08-L01",
  "TASK-557-08-L02",
]);
const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
};
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "findings"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};
const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "scenarios", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    scenarios: {
      type: "array",
      minItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "pass", "visibleEffect"],
        properties: {
          id: { type: "string", minLength: 1 },
          pass: { type: "boolean" },
          visibleEffect: { type: "string", minLength: 1 },
        },
      },
    },
    consoleErrors: { type: "array", items: { type: "string" } },
    screenshots: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
  },
};

function requirePass(label, result) {
  if (!result?.pass || result.errors?.length) throw new Error(`${label}:${JSON.stringify(result)}`);
  return result;
}

function requireAuditResults(label, expected, results) {
  if (!Array.isArray(results) || results.length !== expected || results.some((result) => !result)) {
    throw new Error(`${label}:missing_result`);
  }
  for (const result of results) {
    const blockers = result.findings.filter(
      (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
    );
    if (result.pass !== (blockers.length === 0)) throw new Error(`${label}:inconsistent_result`);
  }
  return results;
}

const COMMON = `Repository: ${ROOT}. Read current HEAD/status/diff and root AGENTS.md first.
TASK-557 implementation requires: remote direct-5432 database ONLY (local Postgres is forbidden by the
owner), pinned changelog 1271, worker schemas named bun_worker_N with search_path = <schema>, public,
contracts audited CLEAN at b45d06bc (zebra fact + scorpion reconcile + stallion recheck). Use the
configured OpenCode coder implementation role required by AGENTS.md (deepseek-v4-flash via 9router
9router:ds/deepseek-v4-flash). Never stage, commit, reset, clean, revert unrelated edits, expose secrets,
weaken tests, or edit outside the current leaf's exact writer paths. Read current on-disk shared files
before editing. Every touched production/test file must finish <=1000 lines. Audit outputs set
pass=true exactly when no HIGH/MEDIUM finding remains; LOW findings stay visible.`;

export const result = await (async () => {
  phase("Start gate");
  const start = requirePass(
    "start-gate",
    await agent(
      `${COMMON}\nRead-only: verify HEAD is b45d06bc, only _TMP-task-dispatch-plan-2026-08-10.md untracked,
  contracts CLEAN per stallion recheck, remote DATABASE_URL reachable (do NOT touch local Postgres),
  migration journal re-read, no writer collision, pinned changelog 1271. Do not edit.`,
      { label: "task-557:start-gate", phase: "Start gate", schema: RESULT_SCHEMA }
    )
  );

  phase("Sequential leaves");
  const leafResults = [];
  for (const leaf of PRODUCT_LEAVES) {
    const implementation = requirePass(
      `implement:${leaf}`,
      await agent(
        `${COMMON}\nImplement only ${leaf} exactly as its current task file specifies. Read the prior leaf's
    reviewed receipt and all terminal owners first. Add the required tests in the correct lane and run
    the leaf's exact lint/types/targeted/security commands, touched-file line counts and git diff --check.
    Return pass only when the owned diff and all required receipts are green.`,
        { label: `task-557:implement:${leaf}`, phase: "Sequential leaves", schema: RESULT_SCHEMA }
      )
    );
    const gate = requirePass(
      `gate:${leaf}`,
      await agent(
        `${COMMON}\nRead-only reviewer for ${leaf}: inspect its complete diff and run/verify the exact owning
    gates. Confirm no forbidden path, weakened assertion, stale handoff, file >1000 lines, or unreported
    skipped command. Do not edit.`,
        { label: `task-557:gate:${leaf}`, phase: "Sequential leaves", schema: RESULT_SCHEMA }
      )
    );
    leafResults.push(Object.freeze({ leaf, implementation, gate }));
  }

  phase("Post-audit");
  const auditPrompts = Object.freeze([
    "Audit scope fidelity, worker-schema isolation, fence namespaces and connection budget.",
    "Audit migration applier idempotence, provisioning, seed assumptions and DB hygiene.",
    "Audit runner orchestration, perf serial-after policy, retry semantics and report integrity.",
    "Audit CI wiring, docs, changelog 1271, board statistics and closure integrity.",
  ]);
  const audits = requireAuditResults(
    "task-557-post-audit",
    auditPrompts.length,
    await parallel(
      auditPrompts.map(
        (prompt, index) => () =>
          agent(
            `${COMMON}\nFresh read-only post-audit. ${prompt} Cite file:line evidence and report every severity.`,
            { label: `task-557:post-audit:${index + 1}`, phase: "Post-audit", schema: AUDIT_SCHEMA }
          )
      )
    )
  );
  const unresolved = audits
    .flatMap((result) => result.findings)
    .filter((finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM");
  if (unresolved.length)
    throw new Error(`task_557_post_audit_findings:${JSON.stringify(unresolved)}`);

  phase("Runtime smoke");
  const smoke = requirePass(
    "task-557:runtime-smoke",
    await agent(
      `${COMMON}\nRun the registered task-557 runtime smoke from a restarted healthy host: verify admin and
   front respond, then at least 5 distinct real-flow scenarios for the touched area with visible-effect
   evidence, zero unexpected console/page/request errors, screenshots in _docs/_workflows/_smoke/ and
   complete owner-scoped cleanup. Do not repair product source.`,
      { label: "task-557:runtime-smoke", phase: "Runtime smoke", schema: SMOKE_SCHEMA }
    )
  );

  phase("Closure");
  const closure = requirePass(
    "closure",
    await agent(
      `${COMMON}\nExecute TASK-557-08-L02 only after all receipts above are current: run full mandatory gates
  (test:bun new runner with a recorded 10-15 min wall time on direct 5432, test:vitest, precommit:check,
  gates:coderso, security scan), update only required docs, changelog 1271/index, TASK-557
  board/statistics and all task statuses. Re-read shared indexes immediately before edits. Never edit
  product source, stage or commit.`,
      { label: "task-557:closure", phase: "Closure", schema: RESULT_SCHEMA }
    )
  );

  phase("Final drift");
  const finalDrift = await agent(
    `${COMMON}\nFresh read-only final audit against current HEAD/status/diff. Verify dependencies, all
  terminal statuses, changelog 1271, board statistics, docs, validated code, security invariants,
  smoke evidence and cleanup. Report every finding.`,
    { label: "task-557:final-drift", phase: "Final drift", schema: AUDIT_SCHEMA }
  );
  requireAuditResults("task-557-final-drift", 1, [finalDrift]);
  if (finalDrift.findings.length) {
    throw new Error(`task_557_final_drift_failed:${JSON.stringify(finalDrift.findings)}`);
  }

  return Object.freeze({
    pass: true,
    summary: "TASK-557 implementation workflow complete.",
    start,
    leafResults,
    audits,
    smoke,
    closure,
    finalDrift,
  });
})();
