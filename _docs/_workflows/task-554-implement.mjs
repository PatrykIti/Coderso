export const meta = Object.freeze({
  name: "task-554-implement",
  description: "Implement TASK-554 sequentially with source gates, post-audit, shared smoke, and closure.",
  phases: Object.freeze([
    Object.freeze({ title: "Start gate" }),
    Object.freeze({ title: "Sequential owners" }),
    Object.freeze({ title: "Post-audit" }),
    Object.freeze({ title: "Runtime smoke" }),
    Object.freeze({ title: "Closure" }),
  ]),
});

const ROOT = "/home/coder/project/Coderso";
const TASK = "TASK-554";
const RESULT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
});
const AUDIT_SCHEMA = Object.freeze({
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
});

const OWNERS = Object.freeze([
  Object.freeze({
    id: "contract-schema-route",
    paths: [
      "core/services/posts/postMetadataContract.ts",
      "core/server/validation/postSchemas.ts",
      "core/server/routes/postsRoutes.ts",
      "tests/vitest/server/postMetadataContract.test.ts",
      "tests/vitest/validation/postSchemas.test.ts",
      "tests/integration/routes/postsRoutes.test.ts",
      "tests/integration/routes/postMetadataRbac.test.ts",
    ],
  }),
  Object.freeze({
    id: "admin-client",
    paths: ["core/admin/services/postsClient.ts", "tests/vitest/admin/postsClient.test.ts"],
  }),
  Object.freeze({
    id: "classic-metadata-ui",
    paths: [
      "core/admin/ui/posts/editor/postMetadataMutationPayload.ts",
      "core/admin/ui/posts/editor/PostClassicEditorShell.tsx",
      "tests/vitest/ui/post-metadata-mutation-payload.test.ts",
      "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx",
      "tests/vitest/ui/post-classic-metadata-hydration.test.tsx",
      "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts",
    ],
  }),
  Object.freeze({
    id: "smoke-adapter",
    paths: [
      "scripts/runtime-smoke/contracts.ts",
      "scripts/runtime-smoke/cli.ts",
      "scripts/runtime-smoke/registry.ts",
      "scripts/runtime-smoke/adapters/task-554.ts",
      "scripts/runtime-smoke/adapters/task-554",
      "tests/unit/runtime-smoke/cli-registry.test.ts",
      "tests/unit/runtime-smoke/task-554-adapter.test.ts",
      "tests/unit/runtime-smoke/task-554-worker.test.ts",
      "docs/develop/runtime-smoke-cookbook.md",
    ],
  }),
]);
const POST_AUDIT_LENSES = Object.freeze([
  "scope-fidelity",
  "rbac-fail-closed",
  "present-only-byte-identity",
  "cross-stream-smoke",
  "test-integrity",
]);
const SMOKE_IDS = Object.freeze([
  "writer-metadata-save-preserves-schedule",
  "writer-status-publish-denied",
  "writer-schedule-denied",
  "publisher-schedule",
  "publisher-publish",
  "publisher-unpublish",
  "publisher-archive",
]);

function assertNoArguments() {
  if (process.argv.length !== 2) throw new Error(`task_554_unknown_arguments:${process.argv.slice(2).join(",")}`);
}

function requirePass(label, result) {
  if (!result?.pass || result.errors?.length) throw new Error(`${label}:${JSON.stringify(result)}`);
  return result;
}

function requireCleanAudits(label, results) {
  if (!Array.isArray(results) || results.length !== POST_AUDIT_LENSES.length || results.some((value) => !value)) {
    throw new Error(`${label}:missing_result`);
  }
  const findings = results.flatMap((result) => result.findings ?? []);
  if (findings.some((finding) => !["HIGH", "MEDIUM", "LOW"].includes(finding.severity))) {
    throw new Error(`${label}:invalid_severity`);
  }
  if (findings.length || results.some((result) => !result.pass)) {
    throw new Error(`${label}:findings:${JSON.stringify(findings)}`);
  }
  return results;
}

const COMMON = `Repository: ${ROOT}; task: ${TASK}; changelog: 1267.
Read current HEAD, status, diff, root AGENTS.md, TASK-554, task board, relevant
architecture/API/RBAC/security/testing docs, source and tests before work. The
pre-existing untracked _TMP-task-dispatch-plan-2026-08-10.md is owner state and
must remain untouched. Use the configured OpenCode coder implementation role
required by AGENTS.md. Never stage, commit, push, reset, clean, revert unrelated
changes, expose secrets, weaken assertions, or edit outside the current owner's
paths. Read shared files immediately before editing. Every touched production or
test module must end at <=1000 physical lines. TASK-551-09-L02 exclusively owns
post-cache/front invalidation: do not edit postsService.ts or add a cache wrapper.
The runtime suite must reuse shared lifecycle/dispatcher/worker/cleanup/browser/
reporting primitives and add only task-specific adapter operations/selectors/
manifest behavior.`;

async function runWorkflow() {
  assertNoArguments();
  phase("Start gate");
  const start = requirePass("task_554_start", await agent(
    `${COMMON}\nRead-only. Verify the three tracked workflow scripts are regular, HEAD-byte-identical,
and the baseline is reachable; verify the amended contract has a fresh clean author/audit/reconcile
receipt. Confirm no writer collision and list exact current dirty state. Do not edit.`,
    { label: "task-554:start-gate", phase: "Start gate", schema: RESULT_SCHEMA },
  ));

  phase("Sequential owners");
  const owners = [];
  for (const owner of OWNERS) {
    const implementation = requirePass(`task_554_implement_${owner.id}`, await agent(
      `${COMMON}\nImplement only owner ${owner.id}. Its allowed paths are ${owner.paths.join(", ")}.
Run its exact targeted Vitest/Bun/static gates, line count and git diff --check. Return structured
evidence; do not run smoke, docs closure, stage, or commit.`,
      { label: `task-554:implement:${owner.id}`, phase: "Sequential owners", schema: RESULT_SCHEMA },
    ));
    const gate = requirePass(`task_554_gate_${owner.id}`, await agent(
      `${COMMON}\nRead-only review of owner ${owner.id}; inspect the complete current diff, verify exact
file ownership, no forbidden path, no weakened test, present-only behavior, line limit, and rerun the
owner's stated gates. Do not edit.`,
      { label: `task-554:gate:${owner.id}`, phase: "Sequential owners", schema: RESULT_SCHEMA },
    ));
    owners.push(Object.freeze({ id: owner.id, implementation, gate }));
  }

  phase("Post-audit");
  const audits = requireCleanAudits("task_554_post_audit", await parallel(
    POST_AUDIT_LENSES.map((lens) => () => agent(
      `${COMMON}\nFresh read-only post-audit lens=${lens}. Cite current file:line evidence. Report every
real finding; pass=true only with zero HIGH/MEDIUM.`,
      { label: `task-554:post-audit:${lens}`, phase: "Post-audit", schema: AUDIT_SCHEMA },
    )),
  ));

  phase("Runtime smoke");
  const smoke = requirePass("task_554_smoke", await agent(
    `${COMMON}\nRestart and probe Admin/front hosts, then run the registered task-554 fast and certification
profiles with shared runtime-smoke primitives. Require exactly these ordered IDs: ${SMOKE_IDS.join(", ")}.
Verify visible DOM/ARIA plus bounded persistence, zero console/page errors, seven reviewed PNGs,
manifest-only session output, cleanup, and fast-evidence removal before certification. Do not repair code.`,
    { label: "task-554:runtime-smoke", phase: "Runtime smoke", schema: RESULT_SCHEMA },
  ));

  phase("Closure");
  const closure = requirePass("task_554_closure", await agent(
    `${COMMON}\nAfter owner review of certification evidence, implement only documentation/metadata closure:
CMS API, RBAC, Security, cookbook, assistant dependency note, changelog 1267/index, board/statistics,
then TASK-554 Done last. Re-read indexes immediately before edits. Do not reopen source, stage, or commit.`,
    { label: "task-554:closure", phase: "Closure", schema: RESULT_SCHEMA },
  ));
  return Object.freeze({ pass: true, start, owners, audits, smoke, closure });
}

export const result = await runWorkflow();
