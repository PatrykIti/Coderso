export const meta = Object.freeze({
  name: "task-545-implement",
  description:
    "Implement TASK-545 leaves sequentially with per-leaf gates, post-audit, runtime smoke and closure",
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
const PRODUCT_LEAVES = Object.freeze([
  "TASK-545-01-L01",
  "TASK-545-02-L01",
  "TASK-545-02-L02",
  "TASK-545-01-L02",
  "TASK-545-03-L01",
  "TASK-545-03-L02",
  "TASK-545-04-L01",
  "TASK-545-04-L02",
  "TASK-545-04-L03",
  "TASK-545-04-L04",
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
const SMOKE_SCENARIO_IDS = Object.freeze([
  "provider-offline-direct-install-available",
  "static-designer-seed-zero-agent-provider",
  "setup-static-designer-seed-reopen",
  "static-source-digest-rbac-idempotency-fail-closed",
  "staged-preview-promotion-front-parity",
]);
const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "scenarios", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    scenarios: {
      type: "array",
      minItems: SMOKE_SCENARIO_IDS.length,
      maxItems: SMOKE_SCENARIO_IDS.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "pass", "visibleEffect"],
        properties: {
          id: { type: "string", enum: SMOKE_SCENARIO_IDS },
          pass: { type: "boolean" },
          visibleEffect: { type: "string", minLength: 1 },
        },
      },
    },
    consoleErrors: { type: "array", items: { type: "string" } },
    screenshots: {
      type: "array",
      minItems: SMOKE_SCENARIO_IDS.length,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
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

function requireSmoke(result) {
  const ids = result?.scenarios?.map((scenario) => scenario.id) ?? [];
  if (
    !result?.pass ||
    !result.serverUp ||
    result.consoleErrors?.length ||
    result.failures?.length ||
    result.scenarios?.some((scenario) => !scenario.pass || !scenario.visibleEffect.trim()) ||
    JSON.stringify(ids) !== JSON.stringify(SMOKE_SCENARIO_IDS) ||
    result.screenshots?.length < SMOKE_SCENARIO_IDS.length
  ) {
    throw new Error(`task_556_runtime_smoke_failed:${JSON.stringify(result)}`);
  }
  return result;
}

const COMMON = `Repository: ${ROOT}. Read current HEAD/status/diff and root AGENTS.md first.
TASK-545 implementation is allowed only after TASK-414, TASK-489, TASK-547 and TASK-555 are terminal
and a fresh read-only audit receipt is clean against unchanged contracts. Local ignored workflow
sidecars are helpers, not closure authority. Use the configured OpenCode coder
implementation role required by AGENTS.md. Never stage, commit, reset, clean, revert unrelated edits,
expose secrets, weaken tests, or edit outside the current leaf's exact writer paths. Read current
on-disk shared files before editing. Every touched production/test file must finish <=1000 lines.
Audit outputs set pass=true exactly when no HIGH/MEDIUM finding remains; LOW findings stay visible.`;

export const result = await (async () => {
  phase("Start gate");
  const start = requirePass(
    "start-gate",
    await agent(
      `${COMMON}\nRead-only: verify dependency status, workflow files, terminal handoff symbols, DB reachability
  when configured, current migration journal, no writer collision, and a clean current contract audit.
  Do not edit.`,
      { label: "task-545:start-gate", phase: "Start gate", schema: RESULT_SCHEMA }
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
        { label: `task-545:implement:${leaf}`, phase: "Sequential leaves", schema: RESULT_SCHEMA }
      )
    );
    const gate = requirePass(
      `gate:${leaf}`,
      await agent(
        `${COMMON}\nRead-only reviewer for ${leaf}: inspect its complete diff and run/verify the exact owning
    gates. Confirm no forbidden path, weakened assertion, stale handoff, file >1000 lines, or unreported
    skipped command. Do not edit.`,
        { label: `task-545:gate:${leaf}`, phase: "Sequential leaves", schema: RESULT_SCHEMA }
      )
    );
    leafResults.push(Object.freeze({ leaf, implementation, gate }));
  }

  const closureHarness = requirePass(
    "implement:TASK-545-04-L02:harness",
    await agent(
      `${COMMON}\nImplement only TASK-545-04-L02's runtime-smoke adapter, worker/database/browser/cleanup
  modules and focused harness tests. Do not run real smoke and do not edit docs, changelog, board or
  task statuses yet. Run the focused harness tests, lint/types, line counts and git diff --check.`,
      {
        label: "task-545:implement:TASK-545-04-L02:harness",
        phase: "Sequential leaves",
        schema: RESULT_SCHEMA,
      }
    )
  );
  const closureHarnessGate = requirePass(
    "gate:TASK-545-04-L02:harness",
    await agent(
      `${COMMON}\nRead-only review of the TASK-545-04-L02 harness diff. Verify exact five IDs, shared lifecycle
  reuse, strict visible evidence, owner-scoped cleanup, no product source and green focused gates.`,
      {
        label: "task-545:gate:TASK-545-04-L02:harness",
        phase: "Sequential leaves",
        schema: RESULT_SCHEMA,
      }
    )
  );

  phase("Post-audit");
  const auditPrompts = Object.freeze([
    "Audit scope, identities, persistence, concurrency, replay and backup.",
    "Audit route transport, RBAC/CSRF/rate/error/privacy and cache correctness.",
    "Audit UI, Setup continuation, direct-install parity, focus and accessibility.",
    "Audit capability/Agent/provider boundaries, tests, smoke and closure integrity.",
  ]);
  const audits = requireAuditResults(
    "task-545-post-audit",
    auditPrompts.length,
    await parallel(
      auditPrompts.map(
        (prompt, index) => () =>
          agent(
            `${COMMON}\nFresh read-only post-audit. ${prompt} Cite file:line evidence and report every severity.`,
            { label: `task-545:post-audit:${index + 1}`, phase: "Post-audit", schema: AUDIT_SCHEMA }
          )
      )
    )
  );
  const unresolved = audits
    .flatMap((result) => result.findings)
    .filter(
      (finding) =>
        finding.severity === "HIGH" || finding.severity === "MEDIUM" || finding.severity === "LOW"
    );
  if (unresolved.length)
    throw new Error(`task_556_post_audit_findings:${JSON.stringify(unresolved)}`);

  phase("Runtime smoke");
  const smoke = requireSmoke(
    await agent(
      `${COMMON}\nRun the registered task-545 fast and certification profiles from a restarted healthy host.
   Require exactly five ordered real scenarios, visible-effect evidence, zero unexpected console/page/
   request errors, reviewed screenshots and complete owner-scoped cleanup. Do not repair product source.`,
      { label: "task-545:runtime-smoke", phase: "Runtime smoke", schema: SMOKE_SCHEMA }
    )
  );

  phase("Closure");
  const closure = requirePass(
    "closure",
    await agent(
      `${COMMON}\nImplement and execute TASK-545-04-L02 only after all receipts above are current: run full mandatory
  gates, update only required docs, changelog 1270/index, TASK-545 board/statistics and all 13 statuses.
  Re-read shared indexes immediately before edits. Never edit product source, stage or commit.`,
      { label: "task-545:closure", phase: "Closure", schema: RESULT_SCHEMA }
    )
  );

  phase("Final drift");
  const finalDrift = await agent(
    `${COMMON}\nFresh read-only final audit against current HEAD/status/diff. Verify dependencies, all 13
  terminal statuses, changelog 1270, board statistics, docs, validated code, security invariants,
  smoke evidence and cleanup. Report every finding.`,
    { label: "task-545:final-drift", phase: "Final drift", schema: AUDIT_SCHEMA }
  );
  requireAuditResults("task-545-final-drift", 1, [finalDrift]);
  if (finalDrift.findings.length) {
    throw new Error(`task_556_final_drift_failed:${JSON.stringify(finalDrift.findings)}`);
  }

  return Object.freeze({
    pass: true,
    summary: "TASK-545 implementation workflow complete.",
    start,
    leafResults,
    closureHarness,
    closureHarnessGate,
    audits,
    smoke,
    closure,
    finalDrift,
  });
})();
