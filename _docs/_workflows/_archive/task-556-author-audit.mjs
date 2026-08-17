export const meta = Object.freeze({
  name: "task-556-author-audit",
  description:
    "Fresh read-only cross-worktree audit of the amended TASK-556 contract and its terminal handoffs",
  phases: Object.freeze([
    Object.freeze({ title: "Dependency evidence" }),
    Object.freeze({ title: "Audit lenses" }),
    Object.freeze({ title: "Cross-file reconcile" }),
  ]),
});

const ROOT = "/home/coder/project/Coderso";
const CONTRACT_ROOT = "/home/coder/project/Coderso-task414-assistant-contract";
const TASK = "TASK-556";
const TASK_FILES = Object.freeze([
  "TASK-556_FormaDom_Code_Owned_Static_Starter_To_Designer_Handoff.md",
  "TASK-556-01-Code-Owned-Static-Source-Persistence-And-Registry.md",
  "TASK-556-01-L01-Schema-Migration-Repository-And-Source-Binding.md",
  "TASK-556-01-L02-Static-Source-Registry-Release-Digest-And-Idempotency.md",
  "TASK-556-02-Static-Package-Staging-Compiler-And-Receipt.md",
  "TASK-556-02-L01-TASK-555-TASK-547-Package-Contribution-And-Compiler-Source-Union-Extension.md",
  "TASK-556-02-L02-Stage-Materialization-Validation-Receipt-And-Canonical-Isolation.md",
  "TASK-556-03-Designer-API-And-Solution-Kits-Setup-UI-Handoff.md",
  "TASK-556-03-L01-Static-Starter-Workspace-Service-Route-And-Client.md",
  "TASK-556-03-L02-Customize-In-Designer-Shared-CTA-And-Host-Slots.md",
  "TASK-556-04-Capability-Reconciliation-Acceptance-And-Closure.md",
  "TASK-556-04-L01-Capability-Boundary-And-Negative-Authorization-Tests.md",
  "TASK-556-04-L02-Five-Flow-Smoke-Docs-And-Closure.md",
]);

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
const DEPENDENCY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors", "implementationAllowed", "nonTerminalDependencies"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    implementationAllowed: { type: "boolean" },
    nonTerminalDependencies: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", enum: ["TASK-414", "TASK-489", "TASK-547", "TASK-555"] },
    },
  },
};

function blockingFindings(result) {
  return result.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
}

function requireAllResults(label, expected, results) {
  if (!Array.isArray(results) || results.length !== expected || results.some((value) => !value)) {
    throw new Error(`${label}:missing_result`);
  }
  for (const result of results) {
    if (
      !Array.isArray(result.findings) ||
      result.pass !== (blockingFindings(result).length === 0)
    ) {
      throw new Error(`${label}:inconsistent_result`);
    }
  }
  return results;
}

function unresolved(results) {
  return results.flatMap(blockingFindings);
}

function requireDependencyEvidence(result) {
  if (!result?.pass || result.errors?.length || !Array.isArray(result.nonTerminalDependencies)) {
    throw new Error(`task_556_dependency_evidence_invalid:${JSON.stringify(result)}`);
  }
  if (result.implementationAllowed !== (result.nonTerminalDependencies.length === 0)) {
    throw new Error("task_556_dependency_gate_inconsistent");
  }
  return result;
}

const COMMON = `Repository: ${ROOT}
TASK-414 contract worktree: ${CONTRACT_ROOT}
Task family: ${TASK}; files: ${TASK_FILES.join(", ")}.
Read current HEAD and dirty status in both worktrees before judging. Current on-disk bytes are
authoritative. Read root AGENTS.md, _docs/_TASKS/README.md, relevant README/CONTRIBUTING and
architecture/API/testing/security docs, all TASK-556 files, terminal/dependency TASK-414,
TASK-489, TASK-547, TASK-551 and TASK-555 contracts, current implementation and tests.
No files may be edited. Findings must be severity ordered with concrete file:line evidence.
Do not expose secrets, credentials, raw sensitive logs, private payloads or user data.
For audit outputs set pass=true exactly when no HIGH/MEDIUM finding remains; LOW findings stay
visible but do not make pass false. Dependency nonterminal state is gate evidence, not task drift.
Verify the implementation gate, exact single-writer paths, terminal handoff symbols, one-current-
binding/one-dispatch concurrency, run-bound receipt, normalizer use, route transport/facade,
Setup continuation, cache invalidation, backup V2, capability compiler, smoke cleanup, query
budgets, workflows, family count, board and changelog 1270.`;

export const result = await (async () => {
  phase("Dependency evidence");
  const dependencyEvidence = requireDependencyEvidence(
    await agent(
      `${COMMON}\nAudit only dependency terminal state, current git evidence, handoff existence, and
  whether implementation is allowed to start. Return pass=true when that evidence was gathered
  without error even when implementationAllowed=false; list every nonterminal required dependency.`,
      {
        label: "audit:task-556:dependencies",
        phase: "Dependency evidence",
        schema: DEPENDENCY_SCHEMA,
      }
    )
  );

  phase("Audit lenses");
  const lensPrompts = Object.freeze([
    "Audit persistence, migrations, binding lifecycle, idempotency, fencing, replay, retention, backup and query budgets.",
    "Audit TASK-555/TASK-547 release, normalization, compiler, stage, receipt, preview and canonical-isolation handoffs.",
    "Audit route transport/facade composition, RBAC/CSRF/rate/error mapping, Admin cache and privacy contracts.",
    "Audit Setup/Solution Kits UI ownership, controlled state, review navigation, accessibility and direct-install parity.",
    "Audit capability generation, Agent/provider negatives, test lanes, runtime smoke, cleanup, workflows and closure metadata.",
  ]);
  const lenses = requireAllResults(
    "task-556-lenses",
    lensPrompts.length,
    await parallel(
      lensPrompts.map(
        (prompt, index) => () =>
          agent(`${COMMON}\n${prompt}`, {
            label: `audit:task-556:lens-${index + 1}`,
            phase: "Audit lenses",
            schema: AUDIT_SCHEMA,
          })
      )
    )
  );

  phase("Cross-file reconcile");
  const reconcile = await agent(
    `${COMMON}\nAudit only cross-file contradictions: one writer per path, shared names/types/errors/routes,
  lock and land order, query budgets, test names, workflow ownership, exact 13-file family and changelog 1270.`,
    { label: "audit:task-556:reconcile", phase: "Cross-file reconcile", schema: AUDIT_SCHEMA }
  );

  const results = [dependencyEvidence, ...lenses, reconcile];
  const findings = unresolved(results);
  if (findings.length > 0) {
    throw new Error(`task_556_contract_not_ready:${JSON.stringify(findings)}`);
  }

  return Object.freeze({
    pass: true,
    implementationAllowed: dependencyEvidence.implementationAllowed,
    summary: dependencyEvidence.implementationAllowed
      ? "TASK-556 amended contract audit is clean and its dependency gate is open."
      : "TASK-556 amended contract audit is clean; its dependency gate remains closed.",
    results,
  });
})();
